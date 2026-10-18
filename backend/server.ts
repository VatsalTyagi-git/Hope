import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './db/index.js';
import falkor from './db/falkor.js';
import { extractCbtSessionData } from './services/cbtExtractor.js';
import { syncSessionToFalkorDB, syncUserProfileToFalkorDB } from './services/graphMemorySync.js';
import { pythonChatbotBridge } from './services/pythonChatbotBridge.js';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const geminiApiKey = process.env.GOOGLE_API_KEY;
const aiClient = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

// Define Types & Interfaces
export interface TranscriptTurn {
  role?: string;
  content?: string;
  createdAt?: number | string | Date;
}

export interface SessionTranscriptPayload {
  roomName?: string;
  userId?: string;
  startedAt?: number;
  endedAt?: number;
  transcript?: TranscriptTurn[];
  mode?: string;
}

export interface InMemoryTranscript {
  id: string;
  roomName?: string;
  userId: string;
  startedAt: Date;
  endedAt: Date;
  transcript: TranscriptTurn[];
  receivedAt: string;
}

process.on('uncaughtException', (err: Error) => {
  console.warn('⚠️  [Backend Uncaught Exception Guard]:', err?.message || err);
});
process.on('unhandledRejection', (reason: unknown) => {
  console.warn('⚠️  [Backend Unhandled Rejection Guard]:', reason);
});

const app = express();
const PORT: number | string = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// In-memory store fallback (in case DB is temporarily offline)
let inMemoryTranscripts: InMemoryTranscript[] = [];

// Health check endpoint with DB and FalkorDB connectivity status
app.get('/health', async (_req: Request, res: Response) => {
  let dbConnected = false;
  let dbError: string | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
  } catch (err: any) {
    dbError = err.message;
  }

  const falkorStatus = await falkor.checkHealth();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    postgres: {
      connected: dbConnected,
      error: dbConnected ? null : dbError,
    },
    falkordb: falkorStatus,
    pythonChatbot: 'bridge-active',
  });
});

// GET all received transcripts from PostgreSQL (falls back to memory if DB offline)
const getSessionsHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string | undefined;
    const where = userId ? { userId } : {};
    const sessions = await prisma.session.findMany({
      where,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      source: 'database',
      count: sessions.length,
      sessions,
    });
  } catch (err: any) {
    console.warn('⚠️ Database query failed, returning in-memory fallback:', err.message);
    return res.json({
      success: true,
      source: 'in-memory-fallback',
      dbError: err.message,
      count: inMemoryTranscripts.length,
      sessions: inMemoryTranscripts,
    });
  }
};

app.get('/api/sessions/transcripts', getSessionsHandler);
app.get('/api/sessions', getSessionsHandler);

// GET a single session by id from PostgreSQL
app.get('/api/sessions/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      const memoryMatch = inMemoryTranscripts.find((s) => s.id === id);
      if (memoryMatch) {
        return res.json({ success: true, source: 'in-memory', session: memoryMatch });
      }
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    return res.json({
      success: true,
      source: 'database',
      session,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE session by id from PostgreSQL and FalkorDB
app.delete('/api/sessions/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.query.userId as string | undefined;

    let pgDeleted = false;
    let pgError: string | null = null;
    let falkorDeleted = false;
    let falkorError: string | null = null;

    // 1. Delete from PostgreSQL
    try {
      // First delete associated messages to satisfy any FK constraint
      await prisma.message.deleteMany({ where: { sessionId: id } }).catch(() => {});
      const delSession = await prisma.session.delete({ where: { id } }).catch((err: any) => {
        // P2025 is record not found
        if (err?.code !== 'P2025') {
          throw err;
        }
        return null;
      });
      if (delSession) {
        pgDeleted = true;
      }
    } catch (err: any) {
      pgError = err?.message || 'PostgreSQL delete error';
      console.warn(`[DELETE /api/sessions/${id}] PostgreSQL note:`, pgError);
    }

    // Also remove from in-memory fallback list if present
    const initLen = inMemoryTranscripts.length;
    inMemoryTranscripts = inMemoryTranscripts.filter((s) => s.id !== id);
    if (inMemoryTranscripts.length < initLen) {
      pgDeleted = true;
    }

    // 2. Delete from FalkorDB knowledge graph
    try {
      const falkorRes = await falkor.deleteSession(id, userId);
      falkorDeleted = Boolean(falkorRes.success);
      if (!falkorRes.success && falkorRes.error) {
        falkorError = falkorRes.error;
      }
    } catch (err: any) {
      falkorError = err?.message || 'FalkorDB delete error';
      console.warn(`[DELETE /api/sessions/${id}] FalkorDB note:`, falkorError);
    }

    console.log(`🗑️ [DELETE /api/sessions/${id}] Purged: Postgres=${pgDeleted}, FalkorDB=${falkorDeleted}`);

    return res.json({
      success: true,
      sessionId: id,
      postgres: { deleted: pgDeleted, error: pgError },
      falkordb: { deleted: falkorDeleted, error: falkorError },
    });
  } catch (err: any) {
    console.error(`[DELETE /api/sessions/:id] Uncaught error:`, err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to delete session' });
  }
});

// GET FalkorDB graph memory statistics
app.get('/api/memory/stats', async (_req: Request, res: Response) => {
  try {
    const g = await falkor.getGraph();
    const nodeCounts = await g.query(`
      MATCH (n)
      RETURN labels(n)[0] AS label, count(n) AS count
      ORDER BY count DESC
    `);
    const relCounts = await g.query(`
      MATCH ()-[r]->()
      RETURN type(r) AS relationship, count(r) AS count
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      nodes: nodeCounts.data || nodeCounts.result_set || [],
      relationships: relCounts.data || relCounts.result_set || [],
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET assigned 7-day daily exercise plan for a user (FalkorDB to PostgreSQL to Defaults)
app.get('/api/exercises/plan/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    // 1. Try FalkorDB
    try {
      const g = await falkor.getGraph();
      const fRes = await g.query(`
        MATCH (u:User {id: $userId})
        OPTIONAL MATCH (u)-[:LATEST_SESSION]->(s:Session)
        OPTIONAL MATCH (u)-[:HAS_STATE]->(a:AgentState)
        OPTIONAL MATCH (u)-[:HAS_DAY_EXERCISE]->(de:DailyAssignedExercise)
        RETURN s.id AS session_id,
               s.started_at AS session_started_at,
               s.ended_at AS session_ended_at,
               s.summary AS session_summary,
               a.next_weekly_session_date AS state_next_weekly_date,
               a.next_weekly_session_at AS state_next_weekly_at,
               a.latest_session_date AS state_latest_session_date,
               de.day_number AS day_number,
               de.assigned_date AS assigned_date,
               de.day_title AS day_title,
               de.exercise_name AS exercise_name,
               de.focus_area AS focus_area,
               de.instruction AS instruction,
               de.target_question AS target_question,
               de.duration_mins AS recommended_duration_mins,
               de.status AS status
        ORDER BY de.day_number ASC
      `, { params: { userId } });

      const rawRows = (fRes.data || (fRes as any).result_set || []) as any[];
      const validPlanRows = rawRows.filter((r) => r.day_number != null || (Array.isArray(r) && r[7] != null));

      if (validPlanRows.length > 0) {
        const firstRow = validPlanRows[0];
        const sId = firstRow.session_id || (Array.isArray(firstRow) ? firstRow[0] : null);
        const sEndedAt = firstRow.session_ended_at || (Array.isArray(firstRow) ? firstRow[2] : null);
        const sStartedAt = firstRow.session_started_at || (Array.isArray(firstRow) ? firstRow[1] : null);
        const sSummary = firstRow.session_summary || (Array.isArray(firstRow) ? firstRow[3] : '');
        const stateNextDate = firstRow.state_next_weekly_date || (Array.isArray(firstRow) ? firstRow[4] : null);
        const stateNextAt = firstRow.state_next_weekly_at || (Array.isArray(firstRow) ? firstRow[5] : null);

        const rawBase = sEndedAt || sStartedAt;
        let baseTimestamp = Math.floor(Date.now() / 1000);
        if (rawBase) {
          const num = Number(rawBase);
          if (num > 1e11) baseTimestamp = Math.floor(num / 1000);
          else if (num > 1e8) baseTimestamp = Math.floor(num);
        }

        const sessionDateStr = new Date(baseTimestamp * 1000).toISOString().split('T')[0];
        const nextTimestamp = baseTimestamp + 7 * 86400;
        let nextDateStr = stateNextDate || new Date(nextTimestamp * 1000).toISOString().split('T')[0];
        if (nextDateStr.startsWith('1970')) {
          nextDateStr = new Date(nextTimestamp * 1000).toISOString().split('T')[0];
        }
        const nextDateObj = new Date(nextDateStr + 'T12:00:00Z');

        const nextWeeklySession = {
          date: nextDateStr,
          timestamp: nextTimestamp,
          formattedDate: nextDateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          dayOfWeek: nextDateObj.getDay(),
        };

        const plan = validPlanRows.map((r) => {
          const dayNum = Number(r.day_number || (Array.isArray(r) ? r[7] : 1));
          let assignedDate = r.assigned_date || (Array.isArray(r) ? r[8] : null);
          if (!assignedDate || assignedDate.startsWith('1970')) {
            assignedDate = new Date((baseTimestamp + dayNum * 86400) * 1000).toISOString().split('T')[0];
          }

          return {
            day_number: dayNum,
            assigned_date: assignedDate,
            day_title: r.day_title || (Array.isArray(r) ? r[9] : `Day ${dayNum}`),
            exercise_name: r.exercise_name || (Array.isArray(r) ? r[10] : 'CBT Exercise'),
            focus_area: r.focus_area || (Array.isArray(r) ? r[11] : 'Cognitive Restructuring'),
            instruction: r.instruction || (Array.isArray(r) ? r[12] : 'Practice mindfully.'),
            target_question: r.target_question || (Array.isArray(r) ? r[13] : 'How was your practice?'),
            recommended_duration_mins: Number(r.recommended_duration_mins || (Array.isArray(r) ? r[14] : 5)),
            status: r.status || (Array.isArray(r) ? r[15] : 'PENDING'),
          };
        });

        return res.json({
          success: true,
          source: 'falkordb',
          userId,
          hasCompletedFirstSession: Boolean(sId),
          latestSession: sId
            ? {
                id: sId,
                date: sessionDateStr,
                timestamp: baseTimestamp,
                summary: sSummary,
              }
            : null,
          nextWeeklySession,
          plan,
        });
      }
    } catch (fErr: any) {
      console.warn('[GET /api/exercises/plan] FalkorDB query note:', fErr.message);
    }

    // 2. Try PostgreSQL latest session
    try {
      const latestSession = await prisma.session.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      const raw = latestSession?.rawTranscript as any;
      const rawPlan = raw?.extractedData?.weekly_daily_plan;
      if (Array.isArray(rawPlan) && rawPlan.length > 0) {
        const baseTimestamp = Math.floor(
          new Date(latestSession!.endedAt || latestSession!.startedAt || latestSession!.createdAt).getTime() / 1000
        );
        const sessionDateStr = new Date(baseTimestamp * 1000).toISOString().split('T')[0];
        const nextTimestamp = baseTimestamp + 7 * 86400;
        const nextDateStr = new Date(nextTimestamp * 1000).toISOString().split('T')[0];
        const nextDateObj = new Date(nextDateStr + 'T12:00:00Z');

        const nextWeeklySession = {
          date: nextDateStr,
          timestamp: nextTimestamp,
          formattedDate: nextDateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          dayOfWeek: nextDateObj.getDay(),
        };

        const plan = rawPlan.map((d: any) => {
          const dayNum = Number(d.day_number || 1);
          const assignedDate =
            d.assigned_date ||
            new Date((baseTimestamp + dayNum * 86400) * 1000).toISOString().split('T')[0];
          return {
            ...d,
            day_number: dayNum,
            assigned_date: assignedDate,
          };
        });

        return res.json({
          success: true,
          source: 'postgresql',
          userId,
          hasCompletedFirstSession: true,
          latestSession: {
            id: latestSession!.id,
            date: sessionDateStr,
            timestamp: baseTimestamp,
            summary: latestSession!.summary,
          },
          nextWeeklySession,
          plan,
        });
      }
    } catch (pgErr: any) {
      console.warn('[GET /api/exercises/plan] Postgres note:', pgErr.message);
    }

    // 3. Fallback to standard evidence-based 7-day CBT progression
    const nowTimestamp = Math.floor(Date.now() / 1000);
    const nowDate = new Date();
    const daysUntilNextSunday = (7 - nowDate.getDay()) % 7 || 7;
    const nextSundayObj = new Date(nowDate.getTime() + daysUntilNextSunday * 86400 * 1000);
    const nextSundayStr = nextSundayObj.toISOString().split('T')[0];

    const defaultPlan = [
      {
        day_number: 1,
        day_title: 'Day 1: Catching Automatic Thoughts',
        exercise_name: '3-Column Thought Record',
        focus_area: 'Identifying cognitive distortions and initial panic triggers',
        instruction: 'Notice when tension rises today. Record the triggering situation and automatic thought.',
        target_question: 'When situations triggered distress today, what automatic thoughts came to your mind first?',
        recommended_duration_mins: 5,
      },
      {
        day_number: 2,
        day_title: 'Day 2: Somatic Regulation Drill',
        exercise_name: 'Physiological Sigh Breathing',
        focus_area: 'Physical nervous system down-regulation',
        instruction: 'Do 5 cycles of physiological sigh (two deep inhales, slow extended exhale) before stressful events.',
        target_question: 'How did your physical tension and breathing respond when you tried the physiological sigh today?',
        recommended_duration_mins: 3,
      },
      {
        day_number: 3,
        day_title: 'Day 3: Evidence Examination',
        exercise_name: 'Evidence Testing Drill',
        focus_area: 'Separating assumptions from objective facts',
        instruction: 'Write down two concrete, objective facts that contradict your negative automatic thought.',
        target_question: 'What objective evidence did you find today that challenged that negative assumption?',
        recommended_duration_mins: 5,
      },
      {
        day_number: 4,
        day_title: 'Day 4: Rational Reframing Practice',
        exercise_name: 'Balanced Thought Generation',
        focus_area: 'Replacing catastrophic predictions with balanced alternatives',
        instruction: 'Whenever you feel anxious, speak your balanced reframe aloud.',
        target_question: 'Were you able to practice your balanced reframe today, and how did it shift your emotion?',
        recommended_duration_mins: 5,
      },
      {
        day_number: 5,
        day_title: 'Day 5: Decatastrophizing Drill',
        exercise_name: 'Best-Worst-Likely Scenario',
        focus_area: 'De-escalating worst-case forecasts',
        instruction: 'Identify the worst outcome, best outcome, and the realistic likely outcome.',
        target_question: 'When analyzing the realistic likely scenario today, what helped you ground your perspective?',
        recommended_duration_mins: 5,
      },
      {
        day_number: 6,
        day_title: 'Day 6: Evening Boundary Enforcement',
        exercise_name: 'Digital Boundary Disconnect',
        focus_area: 'Protecting evening mental recovery and cognitive rest',
        instruction: 'Close your work laptop and silence notifications by 8:00 PM tonight.',
        target_question: 'How did holding your evening boundary go tonight? Did you feel able to let go of work demands?',
        recommended_duration_mins: 5,
      },
      {
        day_number: 7,
        day_title: 'Day 7: Weekly Progress Integration',
        exercise_name: 'Weekly CBT Reflection',
        focus_area: 'Consolidating shifts before your next weekly clinical session',
        instruction: 'Review your 6-day practice streak and observe your emotional shifts.',
        target_question: 'Looking back over the entire week of daily exercises, what progress or breakthrough are you most proud of?',
        recommended_duration_mins: 5,
      },
    ].map((d) => ({
      ...d,
      assigned_date: new Date((nowTimestamp + d.day_number * 86400) * 1000).toISOString().split('T')[0],
      status: 'PENDING',
    }));

    return res.json({
      success: true,
      source: 'clinical-defaults',
      userId,
      hasCompletedFirstSession: false,
      latestSession: null,
      nextWeeklySession: {
        date: nextSundayStr,
        timestamp: Math.floor(nextSundayObj.getTime() / 1000),
        formattedDate: nextSundayObj.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        dayOfWeek: nextSundayObj.getDay(),
      },
      plan: defaultPlan,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST endpoint to clear FalkorDB and reinitialize schema
app.post('/api/memory/clear', async (_req: Request, res: Response) => {
  try {
    const clearRes = await falkor.clearAll();
    await falkor.initIndices();
    console.log('🧹 [FalkorDB] Cleared and indices reinitialized via API.');
    res.json({
      success: true,
      message: 'FalkorDB graph memory cleared completely and indices reinitialized.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET user memory overview from FalkorDB (Primary Root Node: User)
app.get('/api/memory/user/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const g = await falkor.getGraph();

    // Query User primary node
    const userRes = await g.query(
      `
      MATCH (u:User {id: $userId})
      RETURN u.id, u.name, u.created_at, u.baseline_anxiety
      `,
      { params: { userId } }
    );

    // Query active state directly from primary User node
    const stateRes = await g.query(
      `
      MATCH (u:User {id: $userId})-[:HAS_STATE]->(a:AgentState)
      OPTIONAL MATCH (a)-[:ACTIVE_HOMEWORK]->(ex:CBTExercise)
      RETURN a.recommended_next_mode, a.active_homework, a.homework_streak,
             a.urgent_flag, a.handoff_context, a.updated_at, ex.name
      `,
      { params: { userId } }
    );

    // Query all sessions connected directly to primary User node via HAS_SESSION
    const sessionsRes = await g.query(
      `
      MATCH (u:User {id: $userId})-[:HAS_SESSION]->(s:Session)
      OPTIONAL MATCH (s)-[:CONDUCTED_BY]->(c:Companion)
      RETURN s.id, s.mode, s.started_at, s.ended_at, s.initial_mood, s.final_mood, s.summary, c.mode
      ORDER BY s.started_at DESC
      LIMIT 10
      `,
      { params: { userId } }
    );

    // Query episodes branching from sessions under this primary User node
    const episodesRes = await g.query(
      `
      MATCH (u:User {id: $userId})-[:HAS_SESSION]->(s:Session)-[:CAPTURED_EPISODE]->(e:Episode)
      OPTIONAL MATCH (e)-[:INVOLVED_PERSON]->(p:Person)
      OPTIONAL MATCH (e)-[:SPARKED_BY]->(t:Trigger)
      OPTIONAL MATCH (e)-[:EXHIBITED_DISTORTION]->(cd:CognitiveDistortion)
      RETURN e.situation, e.automatic_thought, e.emotion, e.reframed_thought,
             p.name AS person, t.name AS trigger, cd.name AS distortion, e.timestamp
      ORDER BY e.timestamp DESC
      LIMIT 10
      `,
      { params: { userId } }
    );

    // Query personalized therapist rules attached to primary User node
    const rulesRes = await g.query(
      `
      MATCH (u:User {id: $userId})-[:PREFERS_RULE]->(r:TherapistRule)
      RETURN r.rule, r.confidence, r.learned_from_mode
      LIMIT 5
      `,
      { params: { userId } }
    );

    res.json({
      success: true,
      userId,
      user: (userRes.data || userRes.result_set || [])[0] || null,
      agentState: (stateRes.data || stateRes.result_set || [])[0] || null,
      sessions: sessionsRes.data || sessionsRes.result_set || [],
      episodes: episodesRes.data || episodesRes.result_set || [],
      rules: rulesRes.data || rulesRes.result_set || [],
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET complete isolated node tree for a user
app.get('/api/memory/user/:userId/tree', async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const g = await falkor.getGraph();
    const treeRes = await g.query(
      `
      MATCH (u:User {id: $userId})-[r]->(target)
      RETURN type(r) AS relationship, labels(target)[0] AS target_label, target.id AS target_id, target.mode AS mode, target.summary AS summary
      `,
      { params: { userId } }
    );

    res.json({
      success: true,
      userId,
      root: { id: userId, label: 'User' },
      directConnections: treeRes.data || treeRes.result_set || [],
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET user profile from PostgreSQL & FalkorDB
app.get('/api/profile/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    // 1. Fetch from PostgreSQL
    let pgUser: any = null;
    try {
      pgUser = await prisma.user.findUnique({
        where: { id: userId },
      });
    } catch (pgErr: any) {
      console.warn('⚠️ [GET /api/profile/:userId] Postgres note:', pgErr.message);
    }

    // 2. Fetch from FalkorDB
    let falkorUser: any = null;
    try {
      const g = await falkor.getGraph();
      const fRes = await g.query(
        `
        MATCH (u:User {id: $userId})
        OPTIONAL MATCH (u)-[:FOCUSES_ON]->(f:FocusArea)
        RETURN u.name, u.ageRange, u.focusAreas, u.conversationStyle, u.preferredTime, u.preferredMode, u.bio, u.onboardingComplete, collect(f.name) AS focusNodes
        `,
        { params: { userId } }
      );
      if (fRes.data?.[0] || fRes.result_set?.[0]) {
        const row = fRes.data?.[0] || fRes.result_set?.[0];
        falkorUser = {
          name: row[0],
          ageRange: row[1],
          focusAreas: row[2] || row[8],
          conversationStyle: row[3],
          preferredTime: row[4],
          preferredMode: row[5],
          bio: row[6],
          onboardingComplete: row[7],
        };
      }
    } catch (fErr: any) {
      console.warn('⚠️ [GET /api/profile/:userId] FalkorDB note:', fErr.message);
    }

    const merged = {
      id: userId,
      name: pgUser?.name || falkorUser?.name || 'Friend',
      email: pgUser?.email || `${userId}@hope-wellbeing.org`,
      ageRange: pgUser?.ageRange || falkorUser?.ageRange || '25–34',
      focusAreas: pgUser?.focusAreas?.length ? pgUser.focusAreas : (falkorUser?.focusAreas || ['Stress', 'Work-life balance']),
      conversationStyle: pgUser?.conversationStyle || falkorUser?.conversationStyle || 'gentle',
      preferredTime: pgUser?.preferredTime || falkorUser?.preferredTime || 'Evening (7:00 PM)',
      preferredMode: pgUser?.preferredMode || falkorUser?.preferredMode || 'text',
      bio: pgUser?.bio || falkorUser?.bio || '',
      onboardingComplete: Boolean(pgUser?.onboardingComplete ?? falkorUser?.onboardingComplete),
    };

    return res.json({
      success: true,
      profile: merged,
      source: {
        postgres: Boolean(pgUser),
        falkordb: Boolean(falkorUser),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST save user profile to BOTH PostgreSQL and FalkorDB
app.post('/api/profile', async (req: Request, res: Response) => {
  try {
    const {
      userId = '0ccbaecf-43fd-4b7f-91e0-d32233482b07',
      name,
      email,
      ageRange,
      focusAreas = [],
      conversationStyle = 'gentle',
      preferredTime = 'Evening (7:00 PM)',
      preferredMode = 'text',
      bio = '',
    } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const cleanName = (name || '').trim() || 'Friend';
    const cleanEmail = (email || '').trim().toLowerCase() || `${userId}@hope-wellbeing.org`;
    const cleanFocusAreas = Array.isArray(focusAreas) ? focusAreas : [];

    // 1. Save to PostgreSQL
    let pgSaved = false;
    let pgError: string | null = null;
    let updatedPgUser: any = null;

    try {
      updatedPgUser = await prisma.user.upsert({
        where: { id: userId },
        create: {
          id: userId,
          name: cleanName,
          email: cleanEmail,
          ageRange: ageRange || '25–34',
          focusAreas: cleanFocusAreas,
          conversationStyle,
          preferredTime,
          preferredMode,
          bio,
          onboardingComplete: true,
        },
        update: {
          name: cleanName,
          ageRange: ageRange || undefined,
          focusAreas: cleanFocusAreas,
          conversationStyle,
          preferredTime,
          preferredMode,
          bio,
          onboardingComplete: true,
        },
      });
      pgSaved = true;
      console.log(`💾 [POST /api/profile] Saved user profile for '${userId}' to PostgreSQL!`);
    } catch (dbErr: any) {
      pgError = dbErr.message;
      console.warn('⚠️ [POST /api/profile] PostgreSQL error:', dbErr.message);
    }

    // 2. Save to FalkorDB
    let falkorSaved = false;
    let falkorError: string | null = null;

    try {
      await syncUserProfileToFalkorDB({
        userId,
        name: cleanName,
        ageRange,
        focusAreas: cleanFocusAreas,
        conversationStyle,
        preferredTime,
        preferredMode,
        bio,
      });
      falkorSaved = true;
      console.log(`🕸️ [POST /api/profile] Synced user profile for '${userId}' to FalkorDB!`);
    } catch (fErr: any) {
      falkorError = fErr.message;
      console.warn('⚠️ [POST /api/profile] FalkorDB error:', fErr.message);
    }

    return res.json({
      success: true,
      message: 'Profile synchronized in both databases.',
      userId,
      profile: {
        id: userId,
        name: cleanName,
        email: cleanEmail,
        ageRange,
        focusAreas: cleanFocusAreas,
        conversationStyle,
        preferredTime,
        preferredMode,
        bio,
        onboardingComplete: true,
      },
      postgres: { saved: pgSaved, error: pgError },
      falkordb: { saved: falkorSaved, error: falkorError },
    });
  } catch (err: any) {
    console.error('⚠️ [POST /api/profile Fatal Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Inactivity Debounce Timers map for auto-finalizing chat sessions
const sessionDebounceTimers = new Map<string, NodeJS.Timeout>();
const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes of inactivity

function scheduleSessionFinalization(sessionId: string, userId: string) {
  if (sessionDebounceTimers.has(sessionId)) {
    clearTimeout(sessionDebounceTimers.get(sessionId)!);
  }

  const timer = setTimeout(async () => {
    sessionDebounceTimers.delete(sessionId);
    console.log(`⏱️ [Auto-Finalizer] Inactivity timeout reached for session ${sessionId}. Finalizing in background...`);
    await finalizeChatSession(sessionId, userId);
  }, INACTIVITY_TIMEOUT_MS);

  sessionDebounceTimers.set(sessionId, timer);
}

export async function finalizeChatSession(sessionId: string, userId: string) {
  if (sessionDebounceTimers.has(sessionId)) {
    clearTimeout(sessionDebounceTimers.get(sessionId)!);
    sessionDebounceTimers.delete(sessionId);
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!session) {
      console.warn(`[Finalizer] Session ${sessionId} not found.`);
      return { success: false, error: 'Session not found' };
    }

    // Check if session already has a substantive extracted summary
    const existingExtracted = (session.rawTranscript as any)?.extractedData;
    if (existingExtracted && session.summary && !session.summary.startsWith('Brief check-in') && !session.summary.startsWith('The patient')) {
      console.log(`[Finalizer] Session ${sessionId} already has full summary.`);
      return { success: true, alreadyFinalized: true, summary: session.summary, title: existingExtracted.title };
    }

    const turns = session.messages.map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    }));

    const userTurns = turns.filter((t) => t.role === 'user');
    const totalUserWords = userTurns
      .map((t) => t.content?.trim().split(/\s+/).length || 0)
      .reduce((a, b) => a + b, 0);

    // CLINICAL GATEKEEPER: Is the conversation substantive enough for CBT extraction?
    // Rule: At least 2 user turns AND at least 10 user words
    const isSubstantive = userTurns.length >= 2 && totalUserWords >= 10;

    if (!isSubstantive) {
      console.log(
        `ℹ️ [Finalizer] Session ${sessionId} is a brief check-in (${userTurns.length} user turns, ${totalUserWords} words). Skipping FalkorDB graph sync.`
      );
      // Clean objective derivation from user turns:
      // Filter out greetings like "hi", "hello", "hey", "good morning", "yo", "sup"
      const substantiveUserTurn = userTurns.find((t) => {
        const text = (t.content || '').trim();
        return (
          text.length > 0 &&
          !/^(hi|hello|hey|hey there|good morning|good afternoon|good evening|sup|yo|greetings|howdy)[.!?]?$/i.test(text)
        );
      })?.content?.trim();

      let objectiveTitle = 'Mindful Centering & Grounding';
      if (substantiveUserTurn) {
        let clean = substantiveUserTurn
          .replace(/^(i'm feeling|i feel like|i am feeling|can we talk about|i want to talk about|i need help with|feeling)\s+/i, '')
          .trim();
        clean = clean.charAt(0).toUpperCase() + clean.slice(1);
        objectiveTitle = clean.length > 40 ? clean.slice(0, 38) + '…' : clean;
      }

      await prisma.session.update({
        where: { id: sessionId },
        data: {
          summary: objectiveTitle,
          rawTranscript: {
            turns,
            brief: true,
            extractedData: {
              title: objectiveTitle,
              summary: objectiveTitle,
            },
          },
        },
      });
      return {
        success: true,
        substantive: false,
        summary: objectiveTitle,
        title: objectiveTitle,
        falkorSynced: false,
      };
    }

    // SUBSTANTIVE SESSION: Run Gemini CBT Extractor + FalkorDB Graph Sync
    console.log(
      `🧠 [Finalizer] Substantive session detected (${userTurns.length} turns, ${totalUserWords} words). Running CBT extractor...`
    );
    const extractedData = await extractCbtSessionData(turns, {
      mode: 'ON_DEMAND',
      userId,
      roomName: session.roomName,
    });

    // Update PostgreSQL session record with clinical summary & extracted data
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        summary: extractedData.summary,
        rawTranscript: {
          turns,
          extractedData,
        } as any,
      },
    });
    console.log(`📝 [Finalizer] Updated PostgreSQL session ${sessionId} with CBT summary!`);

    // Sync to FalkorDB graph memory
    await syncSessionToFalkorDB({
      userId,
      sessionRecord: session,
      extractedData,
    });
    console.log(`🕸️ [Finalizer] Synced session ${sessionId} to FalkorDB graph memory successfully!`);

    return {
      success: true,
      substantive: true,
      summary: extractedData.summary,
      title: extractedData.title,
      falkorSynced: true,
      extractedData,
    };
  } catch (err: any) {
    console.error(`⚠️ [Finalizer Error] Failed to finalize session ${sessionId}:`, err.message);
    return { success: false, error: err.message };
  }
}

// POST endpoint: Real-time CBT Companion Chatbot with FalkorDB graph memory integration & turn-by-turn persistence
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const {
      sessionId,
      userId = '0ccbaecf-43fd-4b7f-91e0-d32233482b07',
      messages = [],
      mode = 'ON_DEMAND',
    } = req.body;

    // Generate reply using Python CBT Chatbot in my-agent (all prompt & FalkorDB toolcalling logic lives in my-agent)
    const message = await pythonChatbotBridge.generateChatReply({
      userId,
      messages,
      mode,
      sessionId,
    });

    // Automatically persist this turn to PostgreSQL immediately
    if (sessionId) {
      try {
        const now = new Date();
        const fullTranscriptTurns = [
          ...messages,
          { role: 'assistant', content: message.content },
        ];
        const lastUserMsg = messages.length > 0 ? messages[messages.length - 1] : null;

        await prisma.session.upsert({
          where: { id: sessionId },
          create: {
            id: sessionId,
            roomName: `ondemand_chat_${sessionId}`,
            userId,
            startedAt: now,
            endedAt: now,
            rawTranscript: { turns: fullTranscriptTurns },
            messages: {
              create: [
                ...(lastUserMsg
                  ? [{ role: lastUserMsg.role || 'user', content: lastUserMsg.content, createdAt: now }]
                  : []),
                { role: 'assistant', content: message.content, createdAt: now },
              ],
            },
          },
          update: {
            endedAt: now,
            rawTranscript: { turns: fullTranscriptTurns },
            messages: {
              create: [
                ...(lastUserMsg
                  ? [{ role: lastUserMsg.role || 'user', content: lastUserMsg.content, createdAt: now }]
                  : []),
                { role: 'assistant', content: message.content, createdAt: now },
              ],
            },
          },
        });
        console.log(`💾 [Turn Persisted] Saved turn for session ${sessionId} to PostgreSQL!`);

        // Schedule auto-finalization after 3 minutes of inactivity
        scheduleSessionFinalization(sessionId, userId);
      } catch (dbErr: any) {
        console.warn(`⚠️ [Turn Persistence Note]: Could not save turn to PostgreSQL:`, dbErr.message);
      }
    }

    return res.json({
      success: true,
      source: 'my-agent-python',
      message,
    });
  } catch (err: any) {
    console.error('⚠️ [API /api/chat Error]:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Chat generation failed',
    });
  }
});

// POST endpoint to finalize a session immediately (e.g. user clicked End Session or New Conversation)
app.post('/api/sessions/finalize', async (req: Request, res: Response) => {
  try {
    const { sessionId, userId = '0ccbaecf-43fd-4b7f-91e0-d32233482b07' } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }

    const result = await finalizeChatSession(sessionId, userId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

function parseSafeDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    return new Date(val < 10000000000 ? val * 1000 : val);
  }
  if (typeof val === 'string') {
    if (/^\d+$/.test(val)) {
      const num = Number(val);
      return new Date(num < 10000000000 ? num * 1000 : num);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// POST endpoint where LiveKit Agent sends the transcript upon session completion
app.post('/api/sessions/transcript', async (req: Request<{}, {}, SessionTranscriptPayload>, res: Response) => {
  const { roomName, userId, startedAt, endedAt, transcript, mode = 'WEEKLY' } = req.body;

  const parsedStart = parseSafeDate(startedAt) || new Date();
  const parsedEnd = parseSafeDate(endedAt) || new Date();

  console.log('\n======================================================');
  console.log('📥 NEW TRANSCRIPT RECEIVED FROM AI THERAPIST AGENT');
  console.log('======================================================');
  console.log(`🏠 Room:       ${roomName || 'N/A'}`);
  console.log(`👤 User/ID:    ${userId || 'Anonymous'}`);
  console.log(`🧭 Mode:       ${mode}`);
  console.log(
    `⏱️  Duration:   ${parsedStart.toLocaleTimeString()} - ${parsedEnd.toLocaleTimeString()}`
  );
  console.log(`💬 Turn count: ${Array.isArray(transcript) ? transcript.length : 0}`);
  console.log('------------------------------------------------------');

  if (Array.isArray(transcript) && transcript.length > 0) {
    transcript.forEach((turn: TranscriptTurn, idx: number) => {
      const role = (turn.role || 'unknown').toUpperCase();
      const content = turn.content || '';
      console.log(`[${idx + 1}] [${role}]: ${content}`);
    });
  } else {
    console.log('(No message turns recorded in this session)');
  }
  console.log('======================================================\n');

  // 1. Format messages for PostgreSQL relation
  const formattedMessages = Array.isArray(transcript)
    ? transcript
        .filter((turn: TranscriptTurn) => turn.content && turn.content.trim())
        .map((turn: TranscriptTurn) => ({
          role: turn.role || 'user',
          content: turn.content!.trim(),
          createdAt: parseSafeDate(turn.createdAt) || new Date(),
        }))
    : [];

  // Ignore completely empty transcripts with 0 speech turns to avoid creating ghost sessions
  if (formattedMessages.length === 0) {
    console.log('ℹ️ [Session Transcript] 0 speech turns recorded. Skipping database creation.');
    return res.status(200).json({
      success: true,
      message: 'Empty transcript ignored',
      turnsCount: 0,
    });
  }

  let savedSession: any = null;
  let dbError: string | null = null;

  try {
    const existingSession = roomName && roomName !== 'unknown-room'
      ? await prisma.session.findFirst({
          where: { roomName },
          include: { messages: true },
        })
      : null;

    if (existingSession) {
      const existingCount = existingSession.messages?.length || 0;
      const incomingCount = formattedMessages.length;
      if (incomingCount >= existingCount) {
        await prisma.message.deleteMany({ where: { sessionId: existingSession.id } });
        savedSession = await prisma.session.update({
          where: { id: existingSession.id },
          data: {
            endedAt: parsedEnd,
            rawTranscript: (transcript || []) as any,
            messages: {
              create: formattedMessages,
            },
          },
          include: { messages: true },
        });
      } else {
        savedSession = existingSession;
      }
      console.log(`💾 Updated existing session ${savedSession.id} (${roomName}) in PostgreSQL database!`);
    } else {
      savedSession = await prisma.session.create({
        data: {
          roomName: roomName || 'unknown-room',
          userId: userId || 'anonymous',
          startedAt: parsedStart,
          endedAt: parsedEnd,
          rawTranscript: (transcript || []) as any,
          messages: {
            create: formattedMessages,
          },
        },
        include: {
          messages: true,
        },
      });
      console.log(`💾 Saved raw session ${savedSession.id} to PostgreSQL database!`);
    }
  } catch (err: any) {
    dbError = err.message;
    console.warn('⚠️  Could not save to PostgreSQL database:', err.message);

    savedSession = {
      id: `sess_mem_${Date.now()}`,
      roomName,
      userId: userId || 'anonymous',
      startedAt: startedAt ? new Date(startedAt * 1000) : new Date(),
      endedAt: endedAt ? new Date(endedAt * 1000) : new Date(),
    };

    inMemoryTranscripts.push({
      ...savedSession,
      transcript: transcript || [],
      receivedAt: new Date().toISOString(),
    });
  }

  // 2. Generate CBT Summary & Structured Analysis using Gemini LLM
  let extractedData: any = null;
  let extractionError: string | null = null;

  try {
    console.log('🧠 Generating CBT summary & clinical memory extraction via Gemini...');
    extractedData = await extractCbtSessionData(transcript, {
      mode,
      userId: savedSession.userId,
      roomName,
    });
    console.log('✨ CBT Summary generated successfully:');
    console.log(`   "${extractedData.summary}"`);
  } catch (err: any) {
    extractionError = err.message;
    console.error('⚠️  CBT extraction via LLM failed:', err.message);
    extractedData = {
      title: 'Mindfulness & Grounding',
      summary: 'Session completed. Speech turns captured in database.',
      initial_mood: 5,
      final_mood: 5,
      mode,
      episodes: [],
      daily_practice: null,
      homework: null,
      therapist_rules: [],
      agent_state: {
        recommended_next_mode: mode,
        urgent_flag: false,
        handoff_context: '',
      },
    };
  }

  // 3. Update PostgreSQL session record with the generated summary
  if (savedSession && !dbError && extractedData.summary) {
    try {
      await prisma.session.update({
        where: { id: savedSession.id },
        data: {
          summary: extractedData.summary,
          rawTranscript: {
            turns: transcript || [],
            extractedData: extractedData || null,
          } as any,
        },
      });
      console.log(`📝 Updated PostgreSQL session ${savedSession.id} with CBT summary!`);
    } catch (updateErr: any) {
      console.warn('⚠️  Could not update session summary in PostgreSQL:', updateErr.message);
    }
  }

  // 4. Sync entities & relationships into FalkorDB matching the CBT schema
  let falkorSynced = false;
  let falkorError: string | null = null;

  try {
    console.log('🕸️  Syncing session and clinical memory entities into FalkorDB...');
    await syncSessionToFalkorDB({
      userId: savedSession.userId,
      sessionRecord: savedSession,
      extractedData,
    });
    falkorSynced = true;
    console.log('✅ FalkorDB graph memory updated successfully!');
  } catch (err: any) {
    falkorError = err.message;
    console.error('⚠️  FalkorDB graph sync failed:', err.message);
  }

  // 5. Send complete response to agent/client
  res.status(200).json({
    success: true,
    message: 'Transcript saved, summary generated, and FalkorDB graph memory updated.',
    sessionId: savedSession.id,
    userId: savedSession.userId,
    summary: extractedData.summary,
    extractedData,
    dbSaved: !dbError,
    dbError,
    llmExtracted: !extractionError,
    extractionError,
    falkorSynced,
    falkorError,
    turnsCount: Array.isArray(transcript) ? transcript.length : 0,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Express server running on http://localhost:${PORT}`);
  console.log(`👉 Health check: http://localhost:${PORT}/health`);
  console.log(`👉 Transcript endpoint: POST http://localhost:${PORT}/api/sessions/transcript`);
  console.log(`👉 View transcripts: GET http://localhost:${PORT}/api/sessions/transcripts`);
  console.log(`👉 FalkorDB memory stats: GET http://localhost:${PORT}/api/memory/stats`);
  console.log(`👉 User memory overview: GET http://localhost:${PORT}/api/memory/user/:userId`);
});
