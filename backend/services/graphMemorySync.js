import falkor from '../db/falkor.js';

/**
 * Syncs the LLM-extracted CBT session data into FalkorDB.
 *
 * MULTI-TENANT ISOLATION ARCHITECTURE:
 * Every single node (AgentState, Companion, Session, Episode, Person, Trigger,
 * CognitiveDistortion, CoreBelief, DailyPractice, CBTExercise, Handoff, TherapistRule)
 * is strictly scoped with `userId: $userId` and uniquely keyed to that user.
 * ZERO common or shared nodes exist between users, creating completely isolated,
 * independent memory trees for each user in FalkorDB.
 */
export async function syncSessionToFalkorDB({
  userId,
  sessionRecord,
  extractedData,
}) {
  const g = await falkor.getGraph();
  const now = Math.floor(Date.now() / 1000);
  const startedAt = sessionRecord.startedAt
    ? Math.floor(new Date(sessionRecord.startedAt).getTime() / 1000)
    : now - 300;
  const endedAt = sessionRecord.endedAt
    ? Math.floor(new Date(sessionRecord.endedAt).getTime() / 1000)
    : now;

  const mode = (extractedData.mode || 'WEEKLY').toUpperCase();
  const sessionId = sessionRecord.id;
  const initialMood = extractedData.initial_mood || 5;
  const finalMood = extractedData.final_mood || 5;
  const summary = extractedData.summary || 'Session completed.';

  console.log(`[FALKORDB SYNC] Syncing isolated node tree for user ${userId} (session ${sessionId}, mode ${mode})...`);

  // 1. Ensure User node and Dedicated User AgentState exist (completely isolated per user)
  await g.query(
    `
    MERGE (u:User {id: $userId})
    ON CREATE SET u.name = $userName, u.created_at = $now, u.baseline_anxiety = 5
    MERGE (a:AgentState {id: "state_" + $userId})
    ON CREATE SET a.userId = $userId,
                  a.recommended_next_mode = "WEEKLY",
                  a.active_homework = "3-Column Thought Record",
                  a.homework_streak = 0,
                  a.urgent_flag = false,
                  a.handoff_context = "",
                  a.updated_at = $now
    SET a.userId = $userId
    MERGE (u)-[:HAS_STATE]->(a)
    `,
    {
      params: {
        userId,
        userName: sessionRecord.userId || 'User',
        now,
      },
    }
  );

  // 2. Ensure Dedicated User Companion exists (scoped strictly to this user and linked to User)
  await g.query(
    `
    MATCH (u:User {id: $userId})
    MERGE (c:Companion {id: "companion_" + $userId + "_" + $mode})
    ON CREATE SET c.mode = $mode, c.userId = $userId, c.description = $mode + " Companion for " + $userId, c.last_active_at = $now
    SET c.last_active_at = $endedAt, c.userId = $userId
    MERGE (u)-[:HAS_COMPANION]->(c)
    `,
    {
      params: {
        userId,
        mode,
        now,
        endedAt,
      },
    }
  );

  // 3. Create Session node: Connected DIRECTLY to primary node User via HAS_SESSION
  await g.query(
    `
    MATCH (u:User {id: $userId})
    MATCH (c:Companion {id: "companion_" + $userId + "_" + $mode})
    CREATE (s:Session {
      id: $sessionId,
      userId: $userId,
      mode: $mode,
      started_at: $startedAt,
      ended_at: $endedAt,
      initial_mood: $initialMood,
      final_mood: $finalMood,
      summary: $summary,
      transcript_db_id: $sessionId
    })
    CREATE (s)-[:CONDUCTED_BY]->(c)
    MERGE (u)-[:HAS_SESSION]->(s)
    WITH u, s
    OPTIONAL MATCH (u)-[r:LATEST_SESSION]->(prev_s:Session {userId: $userId})
    FOREACH (_ IN CASE WHEN prev_s IS NOT NULL THEN [1] ELSE [] END |
      CREATE (prev_s)-[:NEXT_SESSION {
        hours_between: toFloat($startedAt - prev_s.ended_at) / 3600.0
      }]->(s)
      DELETE r
    )
    MERGE (u)-[:LATEST_SESSION]->(s)
    `,
    {
      params: {
        userId,
        mode,
        sessionId,
        startedAt,
        endedAt,
        initialMood,
        finalMood,
        summary,
      },
    }
  );

  // 4. Record Episodes & Semantic CBT Connections (All scoped strictly to this user)
  if (Array.isArray(extractedData.episodes)) {
    for (let i = 0; i < extractedData.episodes.length; i++) {
      const ep = extractedData.episodes[i];
      const episodeId = `ep_${sessionId}_${i + 1}`;

      await g.query(
        `
        MATCH (s:Session {id: $sessionId, userId: $userId})
        CREATE (e:Episode {
          id: $episodeId,
          userId: $userId,
          situation: $situation,
          automatic_thought: $thought,
          emotion: $emotion,
          intensity_before: $intensityBefore,
          intensity_after: $intensityAfter,
          reframed_thought: $reframe,
          timestamp: $now
        })
        CREATE (s)-[:CAPTURED_EPISODE]->(e)
        `,
        {
          params: {
            userId,
            sessionId,
            episodeId,
            situation: ep.situation || 'Unspecified scenario',
            thought: ep.automatic_thought || '',
            emotion: ep.emotion || 'Distress',
            intensityBefore: ep.intensity_before || 7,
            intensityAfter: ep.intensity_after || 4,
            reframe: ep.reframed_thought || '',
            now,
          },
        }
      );

      // Link Person (scoped to userId)
      if (ep.person && ep.person.name) {
        await g.query(
          `
          MATCH (e:Episode {id: $episodeId, userId: $userId})
          MERGE (p:Person {id: "person_" + $userId + "_" + $personName})
          ON CREATE SET p.name = $personName, p.userId = $userId, p.role = $role, p.relationship_sentiment = $sentiment, p.mention_count = 1
          ON MATCH SET p.mention_count = p.mention_count + 1, p.relationship_sentiment = $sentiment, p.userId = $userId
          CREATE (e)-[:INVOLVED_PERSON]->(p)
          `,
          {
            params: {
              userId,
              episodeId,
              personName: ep.person.name.trim(),
              role: ep.person.role || 'Acquaintance',
              sentiment: ep.person.sentiment || 'neutral',
            },
          }
        );
      }

      // Link Trigger (scoped to userId)
      if (ep.trigger && ep.trigger.name) {
        await g.query(
          `
          MATCH (e:Episode {id: $episodeId, userId: $userId})
          MERGE (t:Trigger {id: "trigger_" + $userId + "_" + $triggerName})
          ON CREATE SET t.name = $triggerName, t.userId = $userId, t.category = $category, t.avg_intensity = toFloat($intensity), t.mention_count = 1
          ON MATCH SET t.avg_intensity = (t.avg_intensity + toFloat($intensity)) / 2.0, t.mention_count = t.mention_count + 1, t.userId = $userId
          CREATE (e)-[:SPARKED_BY]->(t)
          `,
          {
            params: {
              userId,
              episodeId,
              triggerName: ep.trigger.name.trim(),
              category: ep.trigger.category || 'General',
              intensity: ep.trigger.intensity || ep.intensity_before || 7,
            },
          }
        );

        // Person <-> Trigger co-occurrence (within this user's graph)
        if (ep.person && ep.person.name) {
          await g.query(
            `
            MATCH (p:Person {id: "person_" + $userId + "_" + $personName})
            MATCH (t:Trigger {id: "trigger_" + $userId + "_" + $triggerName})
            MERGE (p)-[r:ASSOCIATED_WITH_TRIGGER]->(t)
            ON CREATE SET r.co_occurrence_count = 1
            ON MATCH SET r.co_occurrence_count = r.co_occurrence_count + 1
            `,
            {
              params: {
                userId,
                personName: ep.person.name.trim(),
                triggerName: ep.trigger.name.trim(),
              },
            }
          );
        }
      }

      // Link Cognitive Distortion (scoped to userId)
      if (ep.distortion) {
        await g.query(
          `
          MATCH (e:Episode {id: $episodeId, userId: $userId})
          MERGE (cd:CognitiveDistortion {id: "distortion_" + $userId + "_" + $distortionName})
          ON CREATE SET cd.name = $distortionName, cd.userId = $userId, cd.occurrence_count = 1, cd.example_quote = $thought
          ON MATCH SET cd.occurrence_count = cd.occurrence_count + 1, cd.userId = $userId
          CREATE (e)-[:EXHIBITED_DISTORTION]->(cd)
          `,
          {
            params: {
              userId,
              episodeId,
              distortionName: ep.distortion.trim(),
              thought: ep.automatic_thought || '',
            },
          }
        );

        if (ep.trigger && ep.trigger.name) {
          await g.query(
            `
            MATCH (t:Trigger {id: "trigger_" + $userId + "_" + $triggerName})
            MATCH (cd:CognitiveDistortion {id: "distortion_" + $userId + "_" + $distortionName})
            MERGE (t)-[r:ACTIVATES_DISTORTION]->(cd)
            ON CREATE SET r.weight = 1
            ON MATCH SET r.weight = r.weight + 1
            `,
            {
              params: {
                userId,
                triggerName: ep.trigger.name.trim(),
                distortionName: ep.distortion.trim(),
              },
            }
          );
        }

        // Link Core Belief (scoped to userId)
        if (ep.core_belief && ep.core_belief.statement) {
          await g.query(
            `
            MATCH (cd:CognitiveDistortion {id: "distortion_" + $userId + "_" + $distortionName})
            MERGE (cb:CoreBelief {id: "belief_" + $userId + "_" + $statement})
            ON CREATE SET cb.statement = $statement, cb.userId = $userId, cb.category = $category, cb.strength_score = 0.85
            SET cb.userId = $userId
            MERGE (cd)-[:ROOTED_IN]->(cb)
            `,
            {
              params: {
                userId,
                distortionName: ep.distortion.trim(),
                statement: ep.core_belief.statement.trim(),
                category: ep.core_belief.category || 'Worthlessness',
              },
            }
          );
        }
      }
    }
  }

  // 5. Daily Practice (scoped to userId)
  if (extractedData.daily_practice && extractedData.daily_practice.exercise_name) {
    const dp = extractedData.daily_practice;
    const practiceId = `practice_${sessionId}`;
    await g.query(
      `
      MATCH (s:Session {id: $sessionId, userId: $userId})
      MERGE (ex:CBTExercise {id: "exercise_" + $userId + "_" + $exerciseName})
      ON CREATE SET ex.name = $exerciseName, ex.userId = $userId, ex.times_used = 1, ex.last_used_at = $now
      ON MATCH SET ex.times_used = ex.times_used + 1, ex.last_used_at = $now, ex.userId = $userId
      CREATE (d:DailyPractice {
        id: $practiceId,
        userId: $userId,
        exercise_name: $exerciseName,
        user_reflection: $reflection,
        completed: $completed,
        mood_before: $moodBefore,
        mood_after: $moodAfter,
        friction_note: $frictionNote,
        timestamp: $now
      })
      CREATE (s)-[:LOGGED_PRACTICE]->(d)
      CREATE (d)-[:PRACTICED_EXERCISE]->(ex)
      `,
      {
        params: {
          userId,
          sessionId,
          practiceId,
          exerciseName: dp.exercise_name.trim(),
          reflection: dp.user_reflection || '',
          completed: Boolean(dp.completed),
          moodBefore: dp.mood_before || 5,
          moodAfter: dp.mood_after || 6,
          frictionNote: dp.friction_note || '',
          now,
        },
      }
    );
  }

  // 6. Update Dedicated User AgentState
  const state = extractedData.agent_state || {};
  const recMode = state.recommended_next_mode || (mode === 'WEEKLY' ? 'DAILY' : 'WEEKLY');
  const urgentFlag = Boolean(state.urgent_flag);
  const handoffContext = state.handoff_context || '';
  const homework = extractedData.homework || null;

  await g.query(
    `
    MATCH (u:User {id: $userId})-[:HAS_STATE]->(a:AgentState {id: "state_" + $userId})
    SET a.recommended_next_mode = $recMode,
        a.urgent_flag = $urgentFlag,
        a.handoff_context = $handoffContext,
        a.updated_at = $now
    `,
    {
      params: {
        userId,
        recMode,
        urgentFlag,
        handoffContext,
        now,
      },
    }
  );

  // Link Active Homework (scoped to userId)
  if (homework && homework.exercise_name) {
    await g.query(
      `
      MATCH (a:AgentState {id: "state_" + $userId})
      OPTIONAL MATCH (a)-[old:ACTIVE_HOMEWORK]->()
      DELETE old
      WITH a
      MERGE (ex:CBTExercise {id: "exercise_" + $userId + "_" + $exerciseName})
      ON CREATE SET ex.name = $exerciseName, ex.userId = $userId, ex.times_used = 0, ex.last_used_at = $now
      SET a.active_homework = $exerciseName
      MERGE (a)-[:ACTIVE_HOMEWORK {assigned_at: $now, target_days: $targetDays}]->(ex)
      `,
      {
        params: {
          userId,
          exerciseName: homework.exercise_name.trim(),
          targetDays: homework.target_days || 7,
          now,
        },
      }
    );
  }

  // 7. Explicit Handoff Record (scoped to userId)
  if (handoffContext || urgentFlag || recMode !== mode) {
    const handoffId = `handoff_${sessionId}`;
    await g.query(
      `
      MATCH (s:Session {id: $sessionId, userId: $userId})
      MERGE (from_c:Companion {id: "companion_" + $userId + "_" + $mode})
      MERGE (to_c:Companion {id: "companion_" + $userId + "_" + $recMode})
      CREATE (h:Handoff {
        id: $handoffId,
        userId: $userId,
        from_mode: $mode,
        to_mode: $recMode,
        reason: $reason,
        clinical_note: $clinicalNote,
        status: "PENDING",
        timestamp: $now
      })
      CREATE (s)-[:CREATED_HANDOFF]->(h)
      CREATE (h)-[:FROM_COMPANION]->(from_c)
      CREATE (h)-[:TO_COMPANION]->(to_c)
      `,
      {
        params: {
          userId,
          sessionId,
          handoffId,
          mode,
          recMode,
          reason: urgentFlag ? 'Urgent escalation' : 'Session transition',
          clinicalNote: handoffContext,
          now,
        },
      }
    );
  }

  // 8. Therapist Personalization Rules (scoped strictly to userId)
  if (Array.isArray(extractedData.therapist_rules)) {
    for (const rule of extractedData.therapist_rules) {
      if (rule && rule.trim()) {
        const cleanRule = rule.trim();
        await g.query(
          `
          MATCH (u:User {id: $userId})
          MERGE (r:TherapistRule {id: "rule_" + $userId + "_" + $rule})
          ON CREATE SET r.rule = $rule, r.userId = $userId, r.confidence = 0.9, r.learned_from_mode = $mode
          MERGE (u)-[:PREFERS_RULE]->(r)
          `,
          {
            params: {
              userId,
              rule: cleanRule,
              mode,
            },
          }
        );
      }
    }
  }

  console.log(`✅ [FALKORDB SYNC] Successfully synced isolated memory tree for user '${userId}' into FalkorDB!`);
  return { success: true };
}

export default { syncSessionToFalkorDB };
