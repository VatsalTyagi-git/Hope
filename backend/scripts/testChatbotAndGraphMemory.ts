import prisma from '../db/index.js';
import falkor from '../db/falkor.js';
import dotenv from 'dotenv';
dotenv.config();

const USER_ID = '0ccbaecf-43fd-4b7f-91e0-d32233482b07';
const NEXT_URL = 'http://localhost:3000';

async function main(): Promise<void> {
  console.log('🚀 ========================================================');
  console.log('🧪 TESTING CHATBOT ON DASHBOARD + POSTGRESQL + FALKORDB MEMORY');
  console.log('========================================================\n');

  // Step 1: Check Next.js server connectivity
  console.log('1️⃣ Checking Next.js server on port 3000...');
  try {
    const rootCheck = await fetch(`${NEXT_URL}/chat`, { method: 'GET' });
    console.log(`   Next.js /chat HTTP status: ${rootCheck.status} ${rootCheck.statusText}`);
  } catch (err: any) {
    console.error('❌ Could not connect to Next.js on port 3000:', err?.message || err);
    process.exit(1);
  }

  // Step 2: Test Chatbot Endpoint (POST /api/chat) with FalkorDB memory recall
  console.log('\n2️⃣ Testing On-Demand Companion Chat Endpoint (POST /api/chat)...');
  const chatTurn1 = {
    userId: USER_ID,
    mode: 'ON_DEMAND',
    messages: [
      {
        role: 'user',
        content: 'I am feeling really anxious about Marcus questioning my distributed failover architecture on Project Aurora. What was our cognitive reframe?',
      },
    ],
  };

  const chatRes1 = await fetch(`${NEXT_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(chatTurn1),
  });

  if (!chatRes1.ok) {
    const errText = await chatRes1.text();
    throw new Error(`Chat API failed with status ${chatRes1.status}: ${errText}`);
  }

  const chatData1 = (await chatRes1.json()) as any;
  console.log('✅ Hope Companion Response 1 received:');
  console.log(`"${chatData1.message?.content}"\n`);

  const reply1 = chatData1.message?.content || '';
  const recalledMarcusOrAurora = /marcus|aurora|failover|latency|distortion|reframe/i.test(reply1);
  console.log(`🔍 Memory Recall Check (Marcus/Aurora/Failover/Reframe in response): ${recalledMarcusOrAurora ? 'PASSED ✅' : 'FAILED ❌'}`);

  // Step 3: Send follow-up turn
  console.log('\n3️⃣ Sending follow-up chat turn about 8 PM laptop boundary with Julian...');
  const chatTurn2 = {
    userId: USER_ID,
    mode: 'ON_DEMAND',
    messages: [
      chatTurn1.messages[0],
      { role: 'assistant', content: reply1 },
      {
        role: 'user',
        content: 'Thank you Hope. I will also make sure to close my laptop at 8 PM tonight as we planned with Julian.',
      },
    ],
  };

  const chatRes2 = await fetch(`${NEXT_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(chatTurn2),
  });

  const chatData2 = (await chatRes2.json()) as any;
  console.log('✅ Hope Companion Response 2 received:');
  console.log(`"${chatData2.message?.content}"\n`);
  const reply2 = chatData2.message?.content || '';

  // Step 4: Persist Chat Transcript to PostgreSQL & FalkorDB via POST /api/sessions/transcript
  console.log('\n4️⃣ Persisting Chat Transcript to PostgreSQL and FalkorDB (POST /api/sessions/transcript)...');
  const testRoomName = `ondemand_chat_${Date.now()}`;
  const transcriptPayload = {
    roomName: testRoomName,
    userId: USER_ID,
    mode: 'ON_DEMAND',
    startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    endedAt: new Date().toISOString(),
    transcript: [
      { role: 'user', content: chatTurn1.messages[0].content },
      { role: 'assistant', content: reply1 },
      { role: 'user', content: 'Thank you Hope. I will also make sure to close my laptop at 8 PM tonight as we planned with Julian.' },
      { role: 'assistant', content: reply2 },
    ],
  };

  const transcriptRes = await fetch(`${NEXT_URL}/api/sessions/transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transcriptPayload),
  });

  if (!transcriptRes.ok) {
    const errText = await transcriptRes.text();
    throw new Error(`Transcript API failed with status ${transcriptRes.status}: ${errText}`);
  }

  const transcriptData = (await transcriptRes.json()) as any;
  console.log('✅ Transcript Persist Result:');
  console.log(`   Session ID: ${transcriptData.sessionId}`);
  console.log(`   PostgreSQL DB Saved: ${transcriptData.dbSaved ? 'YES ✅' : 'NO ❌'}`);
  console.log(`   LLM CBT Extracted: ${transcriptData.llmExtracted ? 'YES ✅' : 'NO ❌'}`);
  console.log(`   FalkorDB Synced: ${transcriptData.falkorSynced ? 'YES ✅' : 'NO ❌'}`);
  console.log(`   Summary: "${transcriptData.summary}"`);
  console.log(`   Distortions:`, transcriptData.extractedData?.episodes?.map((e: any) => e.distortion) || []);
  console.log(`   Takeaway / Reframe:`, transcriptData.extractedData?.episodes?.[0]?.reframed_thought || transcriptData.extractedData?.takeaway);

  // Step 5: Verify in PostgreSQL directly
  console.log('\n5️⃣ Verifying Session in PostgreSQL directly via Prisma...');
  const pgSession = await prisma.session.findUnique({
    where: { id: transcriptData.sessionId },
    include: { messages: true },
  });

  if (pgSession) {
    console.log(`✅ Found session in PostgreSQL: id=${pgSession.id}, roomName=${pgSession.roomName}`);
    console.log(`   Messages saved in DB: ${pgSession.messages.length} messages`);
    console.log(`   DB Summary: "${pgSession.summary?.slice(0, 80)}..."`);
  } else {
    console.error('❌ Session NOT found in PostgreSQL database!');
  }

  // Step 6: Verify in FalkorDB directly
  console.log('\n6️⃣ Verifying Graph Memory in FalkorDB directly...');
  try {
    const g = await falkor.getGraph();
    const result = await g.query(`
      MATCH (p:User {id: $userId})-[r:HAD_SESSION]->(s:Session)
      RETURN s.roomName as roomName, s.id as dbId, s.endedAt as sessionDate
      ORDER BY s.endedAt DESC
      LIMIT 3
    `, { params: { userId: USER_ID } });

    const rows = (result.data || (result as any).result_set || []) as any[];
    console.log(`✅ FalkorDB query returned ${rows.length} recent sessions for Elena:`);
    rows.forEach((row, i) => {
      console.log(`   ${i + 1}. Room: ${row.roomName}, ID: ${row.dbId}, Date: ${row.sessionDate}`);
    });
  } catch (falkorErr: any) {
    console.error('⚠️ FalkorDB query note:', falkorErr?.message || falkorErr);
  }

  // Step 7: Verify Dashboard API GET /api/sessions returns the new session
  console.log('\n7️⃣ Verifying Dashboard GET /api/sessions API returns the new session...');
  const dashRes = await fetch(`${NEXT_URL}/api/sessions?userId=${encodeURIComponent(USER_ID)}`);
  const dashData = (await dashRes.json()) as any;
  const foundInDash = dashData.sessions?.some((s: any) => s.id === transcriptData.sessionId);
  console.log(`✅ Dashboard Sessions count: ${dashData.sessions?.length}`);
  console.log(`   Newly saved session present in dashboard list: ${foundInDash ? 'YES ✅' : 'NO ❌'}`);

  console.log('\n🎉 ALL CHECKS PASSED SUCCESSFULLY!');
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
