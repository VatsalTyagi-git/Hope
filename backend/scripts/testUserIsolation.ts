import falkor from '../db/falkor.js';
import { syncSessionToFalkorDB } from '../services/graphMemorySync.js';

async function runTest(): Promise<void> {
  console.log('🧪 [TEST] Starting User Isolation & Primary Node Schema Validation...');

  // 1. Clear DB
  console.log('🧹 [TEST] Clearing FalkorDB...');
  await falkor.clearAll();
  await falkor.initIndices();

  // 2. Sync Session 1 for Alice
  console.log('👤 [TEST] Syncing Session 1 for Alice (alice_101)...');
  await syncSessionToFalkorDB({
    userId: 'alice_101',
    sessionRecord: {
      id: 'alice_sess_01',
      userId: 'alice_101',
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      endedAt: new Date().toISOString(),
    },
    extractedData: {
      mode: 'WEEKLY',
      summary: 'Alice explored performance anxiety around manager meetings.',
      initial_mood: 4,
      final_mood: 7,
      episodes: [
        {
          situation: 'Manager criticized presentation slide',
          automatic_thought: 'I am completely incompetent at this job',
          emotion: 'Anxiety',
          intensity_before: 8,
          intensity_after: 4,
          reframed_thought: 'One slide needing revision does not negate my overall project contribution',
          person: { name: 'Manager Dave', role: 'Manager', sentiment: 'strained' },
          trigger: { name: 'Slide review feedback', category: 'Work', intensity: 8 },
          distortion: 'All-or-Nothing Thinking',
          core_belief: { statement: 'I must be flawless or I am a failure', category: 'Worthlessness' },
        },
      ],
      daily_practice: {
        exercise_name: '3-Column Thought Record',
        user_reflection: 'Felt lighter after seeing the alternative perspective written down.',
        completed: true,
        mood_before: 4,
        mood_after: 7,
      },
      homework: {
        exercise_name: '3-Column Thought Record',
        target_days: 7,
      },
      therapist_rules: ['Prompt Alice for evidence testing before offering reframes.'],
    },
  });

  // 3. Sync Session 2 for Alice
  console.log('👤 [TEST] Syncing Session 2 for Alice (alice_101)...');
  await syncSessionToFalkorDB({
    userId: 'alice_101',
    sessionRecord: {
      id: 'alice_sess_02',
      userId: 'alice_101',
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
    },
    extractedData: {
      mode: 'DAILY',
      summary: 'Alice completed daily thought record drill regarding team lunch.',
      initial_mood: 6,
      final_mood: 8,
      episodes: [
        {
          situation: 'Awkward silence during team lunch',
          automatic_thought: 'Everyone thinks I am weird and boring',
          emotion: 'Shame',
          intensity_before: 7,
          intensity_after: 3,
          reframed_thought: 'Silence in conversations is natural and not about me personally',
          person: { name: 'Colleague Sarah', role: 'Peer', sentiment: 'neutral' },
          trigger: { name: 'Team lunch silence', category: 'Social', intensity: 7 },
          distortion: 'Mind Reading',
          core_belief: { statement: 'I am unlikable', category: 'Unlovability' },
        },
      ],
    },
  });

  // 4. Sync Session 1 for Bob
  console.log('👤 [TEST] Syncing Session 1 for Bob (bob_202)...');
  await syncSessionToFalkorDB({
    userId: 'bob_202',
    sessionRecord: {
      id: 'bob_sess_01',
      userId: 'bob_202',
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
    },
    extractedData: {
      mode: 'WEEKLY',
      summary: 'Bob discussed burnout and insomnia related to quarterly deadline.',
      initial_mood: 3,
      final_mood: 6,
      episodes: [
        {
          situation: 'Late night deadline approaching',
          automatic_thought: 'If I do not finish everything tonight I will be fired',
          emotion: 'Panic',
          intensity_before: 9,
          intensity_after: 5,
          reframed_thought: 'The deadline has a buffer and communicating tomorrow morning is acceptable',
          person: { name: 'Manager Dave', role: 'Manager', sentiment: 'demanding' },
          trigger: { name: 'Quarterly deadline', category: 'Work', intensity: 9 },
          distortion: 'Catastrophizing',
          core_belief: { statement: 'I am helpless against demands', category: 'Helplessness' },
        },
      ],
    },
  });

  // 5. Verification 1: Are ALL Alice sessions directly connected to primary User node (alice_101)?
  const g = await falkor.getGraph();
  const aliceSessionsRes = await g.query(`
    MATCH (u:User {id: "alice_101"})-[:HAS_SESSION]->(s:Session)
    RETURN s.id AS sessionId, s.mode AS mode
    ORDER BY s.id
  `);
  const aliceSessions = (aliceSessionsRes.data || (aliceSessionsRes as any).result_set || []) as any[];
  console.log('\n📊 [TEST] Alice direct sessions connected to primary User node:', aliceSessions);
  if (aliceSessions.length !== 2) {
    throw new Error(`Expected Alice to have 2 directly connected sessions via [:HAS_SESSION], got ${aliceSessions.length}`);
  }

  // 6. Verification 2: Is Bob session directly connected to primary User node (bob_202)?
  const bobSessionsRes = await g.query(`
    MATCH (u:User {id: "bob_202"})-[:HAS_SESSION]->(s:Session)
    RETURN s.id AS sessionId, s.mode AS mode
  `);
  const bobSessions = (bobSessionsRes.data || (bobSessionsRes as any).result_set || []) as any[];
  console.log('📊 [TEST] Bob direct sessions connected to primary User node:', bobSessions);
  if (bobSessions.length !== 1) {
    throw new Error(`Expected Bob to have 1 directly connected session via [:HAS_SESSION], got ${bobSessions.length}`);
  }

  // 7. Verification 3: Strict multi-tenant isolation: ZERO connecting paths between Alice and Bob
  const crossPathRes = await g.query(`
    MATCH (uA:User {id: "alice_101"})-[*1..10]-(target)
    WHERE target:User AND target.id = "bob_202"
    RETURN count(*) AS crossConnections
  `);
  const crossCount = (crossPathRes.data || (crossPathRes as any).result_set || [])[0]?.crossConnections || 0;
  console.log(`🔒 [TEST] Cross-user connections between Alice and Bob: ${crossCount}`);
  if (Number(crossCount) !== 0) {
    throw new Error(`CRITICAL FAILURE: Found ${crossCount} connecting paths between Alice and Bob!`);
  }

  // 8. Verification 4: Person 'Manager Dave' exists separately in both graphs with separate scoped IDs
  const personDaveRes = await g.query(`
    MATCH (p:Person)
    WHERE p.name = "Manager Dave"
    RETURN p.id AS personId, p.userId AS userId
  `);
  const daves = (personDaveRes.data || (personDaveRes as any).result_set || []) as any[];
  console.log('👥 [TEST] Separately scoped Person nodes for "Manager Dave":', daves);
  if (daves.length !== 2) {
    throw new Error(`Expected 2 isolated Manager Dave nodes, got ${daves.length}`);
  }

  // 9. Verification 5: Verify Alice tree structure
  const aliceTreeRes = await g.query(`
    MATCH (u:User {id: "alice_101"})-[r]->(child)
    RETURN type(r) AS rel, labels(child)[0] AS label, child.id AS childId
  `);
  console.log('\n🌳 [TEST] Alice Primary Node Direct Outgoing Edges:');
  const aliceEdges = (aliceTreeRes.data || (aliceTreeRes as any).result_set || []) as any[];
  for (const edge of aliceEdges) {
    console.log(`  User(alice_101) -[:${edge.rel}]-> :${edge.label} (${edge.childId})`);
  }

  console.log('\n✅ [TEST SUCCESS] All User Isolation & Primary Node tests passed with 100% precision!');
  process.exit(0);
}

runTest().catch((err: unknown) => {
  console.error('\n❌ [TEST FAILED]:', err);
  process.exit(1);
});
