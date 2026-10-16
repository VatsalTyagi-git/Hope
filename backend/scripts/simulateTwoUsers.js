import falkor from '../db/falkor.js';

const BACKEND_URL = 'http://localhost:5000';

async function simulate() {
  console.log('================================================================');
  console.log('🚀 SIMULATING 2 SESSIONS FOR 2 DIFFERENT USERS (DIFFERENT EMAILS)');
  console.log('================================================================\n');

  // 1. Clear FalkorDB to ensure a clean starting state
  console.log('🧹 [1/4] Clearing FalkorDB to 0 nodes...');
  await falkor.clearAll();
  await falkor.initIndices();
  console.log('✅ FalkorDB cleared successfully!\n');

  const now = Math.floor(Date.now() / 1000);

  // User 1: sarah.miller@gmail.com
  const user1 = {
    email: 'sarah.miller@gmail.com',
    name: 'Sarah Miller',
    roomName: 'hope_room_weekly_sarah.miller@gmail.com',
    startedAt: now - 1800,
    endedAt: now - 300,
    transcript: [
      {
        role: 'assistant',
        content: "Hello Sarah, welcome to Hope. I'm so glad we're connecting today. How are you feeling right now, and what's on your mind?",
      },
      {
        role: 'user',
        content: "Honestly, I've been feeling overwhelmed with work anxiety. My engineering manager Marcus gave some tough feedback on my code architecture yesterday, and I spiraled. I keep thinking 'If I make any mistakes on this release, I'm completely incompetent and I'll get fired.'",
      },
      {
        role: 'assistant',
        content: "Thank you for sharing that with me, Sarah. That sounds heavy and exhausting. Notice how your mind leaped from receiving code feedback to 'I am completely incompetent and will get fired.' In CBT, we call this All-or-Nothing Thinking and Catastrophizing. Let's look at the evidence together: has Marcus ever praised your work before?",
      },
      {
        role: 'user',
        content: "Yeah, last week he told the team my database optimization was stellar. I guess I'm overlooking that completely.",
      },
      {
        role: 'assistant',
        content: "That is significant evidence. How might we reframe that initial thought into something more balanced?",
      },
      {
        role: 'user',
        content: "Maybe: 'Constructive feedback on code architecture helps me improve as an engineer, and one critique does not erase my accomplishments or mean I'm getting fired.'",
      },
      {
        role: 'assistant',
        content: "That is a powerful, balanced reframe. How is your anxiety level now compared to when we started?",
      },
      {
        role: 'user',
        content: "It was an 8 out of 10, now it feels like a 4 out of 10. Much calmer.",
      },
      {
        role: 'assistant',
        content: "Wonderful progress. For daily practice this week, let's have you use the 3-Column Thought Record whenever you feel that imposter spiral. We'll review your streak next week.",
      },
    ],
  };

  // User 2: alex.chen@yahoo.com
  const user2 = {
    email: 'alex.chen@yahoo.com',
    name: 'Alex Chen',
    roomName: 'hope_room_weekly_alex.chen@yahoo.com',
    startedAt: now - 1200,
    endedAt: now - 60,
    transcript: [
      {
        role: 'assistant',
        content: "Hi Alex, welcome to your first therapy session with Hope. Take a deep breath. How are things feeling for you today?",
      },
      {
        role: 'user',
        content: "Hey. Things have been pretty isolating lately. I went to a networking event on Thursday with my colleague Priya, and during a group conversation there was an awkward silence. I immediately thought: 'Everyone here thinks I'm boring and nobody wants me around.'",
      },
      {
        role: 'assistant',
        content: "Thank you for being so honest, Alex. Social situations can trigger intense vulnerability. Notice the thought: 'Everyone thinks I'm boring.' In cognitive behavioral therapy, we call this Mind Reading—assuming you know other people's negative judgments without proof. Did anyone say or do anything to indicate that?",
      },
      {
        role: 'user',
        content: "No, Priya actually introduced me to two people and we talked about photography for twenty minutes afterwards. It was just that five seconds of silence that made me panic.",
      },
      {
        role: 'assistant',
        content: "Exactly. The silence belonged to the whole group, not your worth as a person. How could we reframe that?",
      },
      {
        role: 'user',
        content: "Silence in conversation is normal and doesn't mean people dislike me or find me boring.",
      },
      {
        role: 'assistant',
        content: "Spot on. Your distress went from a 7 down to a 3. For your practice, let's try Behavioral Activation: schedule one 10-minute coffee chat with a colleague this week.",
      },
    ],
  };

  // 2. Submit Session for User 1 (Sarah)
  console.log(`👤 [2/4] Processing Session for User 1: "${user1.email}" (${user1.name})...`);
  const res1 = await fetch(`${BACKEND_URL}/api/sessions/transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomName: user1.roomName,
      userId: user1.email,
      startedAt: user1.startedAt,
      endedAt: user1.endedAt,
      mode: 'WEEKLY',
      transcript: user1.transcript,
    }),
  });
  const data1 = await res1.json();
  console.log(`✅ Session 1 result for ${user1.email}:`, data1.message);
  console.log(`   Session ID: ${data1.sessionId}`);
  console.log(`   CBT Summary: "${data1.extractedData?.summary || 'N/A'}"\n`);

  // 3. Submit Session for User 2 (Alex)
  console.log(`👤 [3/4] Processing Session for User 2: "${user2.email}" (${user2.name})...`);
  const res2 = await fetch(`${BACKEND_URL}/api/sessions/transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomName: user2.roomName,
      userId: user2.email,
      startedAt: user2.startedAt,
      endedAt: user2.endedAt,
      mode: 'WEEKLY',
      transcript: user2.transcript,
    }),
  });
  const data2 = await res2.json();
  console.log(`✅ Session 2 result for ${user2.email}:`, data2.message);
  console.log(`   Session ID: ${data2.sessionId}`);
  console.log(`   CBT Summary: "${data2.extractedData?.summary || 'N/A'}"\n`);

  // 4. Verify FalkorDB Multi-Tenant Isolation
  console.log('🔍 [4/4] VERIFYING FALKORDB ISOLATION & NODE TREES...');
  const g = await falkor.getGraph();

  // Query User 1 tree
  const tree1 = await g.query(`
    MATCH (u:User {id: $email})-[r]->(target)
    RETURN type(r) AS rel, labels(target)[0] AS targetLabel, target.id AS targetId
  `, { params: { email: user1.email } });

  // Query User 2 tree
  const tree2 = await g.query(`
    MATCH (u:User {id: $email})-[r]->(target)
    RETURN type(r) AS rel, labels(target)[0] AS targetLabel, target.id AS targetId
  `, { params: { email: user2.email } });

  // All nodes for User 1
  const allNodesUser1 = await g.query(`
    MATCH (n) WHERE n.userId = $email OR n.id = $email
    RETURN labels(n)[0] AS label, count(n) AS count
  `, { params: { email: user1.email } });

  // All nodes for User 2
  const allNodesUser2 = await g.query(`
    MATCH (n) WHERE n.userId = $email OR n.id = $email
    RETURN labels(n)[0] AS label, count(n) AS count
  `, { params: { email: user2.email } });

  // Check for any cross-connecting paths between User 1 and User 2
  const crossPaths = await g.query(`
    MATCH (u1:User {id: $email1})-[*1..10]-(target)
    WHERE target:User AND target.id = $email2
    RETURN count(*) AS crossCount
  `, { params: { email1: user1.email, email2: user2.email } });

  const crossCount = (crossPaths.data || crossPaths.result_set || [])[0]?.crossCount || 0;

  console.log('\n================================================================');
  console.log(`🌳 USER 1: "${user1.email}" PRIMARY NODE DIRECT EDGES:`);
  console.log('================================================================');
  for (const row of (tree1.data || tree1.result_set || [])) {
    console.log(`  (:User {id: "${user1.email}"}) -[:${row.rel}]-> (:${row.targetLabel} {id: "${row.targetId}"})`);
  }
  console.log('\nTotal nodes owned by User 1:');
  for (const row of (allNodesUser1.data || allNodesUser1.result_set || [])) {
    console.log(`  - ${row.label}: ${row.count}`);
  }

  console.log('\n================================================================');
  console.log(`🌳 USER 2: "${user2.email}" PRIMARY NODE DIRECT EDGES:`);
  console.log('================================================================');
  for (const row of (tree2.data || tree2.result_set || [])) {
    console.log(`  (:User {id: "${user2.email}"}) -[:${row.rel}]-> (:${row.targetLabel} {id: "${row.targetId}"})`);
  }
  console.log('\nTotal nodes owned by User 2:');
  for (const row of (allNodesUser2.data || allNodesUser2.result_set || [])) {
    console.log(`  - ${row.label}: ${row.count}`);
  }

  console.log('\n================================================================');
  console.log('🔒 MULTI-TENANT ISOLATION CHECK:');
  console.log('================================================================');
  console.log(`Connecting paths between User 1 and User 2: ${crossCount}`);
  if (Number(crossCount) === 0) {
    console.log('✅ PERFECT ISOLATION: 0 connecting paths between User 1 and User 2!');
    console.log('✅ Each user exists in their own completely isolated, disjoint tree in FalkorDB!');
  } else {
    console.error('❌ FAILED: Found cross-user connections!');
  }
  console.log('================================================================\n');

  process.exit(0);
}

simulate().catch((err) => {
  console.error('Simulation error:', err);
  process.exit(1);
});
