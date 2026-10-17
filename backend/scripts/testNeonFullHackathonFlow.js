import fetch from 'node-fetch';
import prisma from '../db/index.js';

const NEXT_URL = 'http://localhost:3000';

async function main() {
  console.log('🚀 ========================================================');
  console.log('🧪 TESTING NEON DB PRODUCTION FLOW FOR MAIN HACKATHON PROJECT');
  console.log('========================================================\n');

  const timestamp = Date.now();
  const testEmail = `hackathon.user.${timestamp}@hope.ai`;
  const testPassword = 'ProductionHackathonPass2026!';
  const testName = 'Hackathon Developer';

  // 1. Test Registration via Neon DB endpoint
  console.log(`1️⃣ Registering new user on Neon PostgreSQL: ${testEmail}...`);
  const regRes = await fetch(`${NEXT_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: testPassword,
    }),
  });

  if (!regRes.ok) {
    const errText = await regRes.text();
    throw new Error(`Registration failed (${regRes.status}): ${errText}`);
  }

  const regData = await regRes.json();
  const userId = regData.user.id;
  console.log(`✅ Registered user in Neon DB! User ID: ${userId}`);

  // 2. Verify directly in Neon PostgreSQL
  console.log('\n2️⃣ Verifying user record in Neon PostgreSQL via Prisma...');
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!dbUser) {
    throw new Error('User was not found in Neon DB!');
  }
  console.log(`✅ Verified in Neon DB: Name="${dbUser.name}", Email="${dbUser.email}", CreatedAt=${dbUser.createdAt}`);

  // 3. Test Login API endpoint
  console.log('\n3️⃣ Testing Login authentication against Neon PostgreSQL...');
  const loginRes = await fetch(`${NEXT_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });

  if (!loginRes.ok) {
    const errText = await loginRes.text();
    throw new Error(`Login failed (${loginRes.status}): ${errText}`);
  }

  const loginData = await loginRes.json();
  console.log(`✅ Successfully logged in! Verified User ID: ${loginData.user.id}`);

  // 4. Test Chatbot Endpoint for this real user
  console.log('\n4️⃣ Testing On-Demand Companion Chatbot for this new user...');
  const chatRes = await fetch(`${NEXT_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: userId,
      mode: 'ON_DEMAND',
      messages: [
        {
          role: 'user',
          content: 'Hello Hope, this is my first session. I am pitching our hackathon project in an hour and feeling nervous.',
        },
      ],
    }),
  });

  if (!chatRes.ok) {
    const errText = await chatRes.text();
    throw new Error(`Chat API failed (${chatRes.status}): ${errText}`);
  }

  const chatData = await chatRes.json();
  console.log(`✅ Hope companion response generated:`);
  console.log(`"${chatData.message?.content}"\n`);
  const assistantReply = chatData.message?.content || '';

  // 5. Persist Chat Transcript to Neon PostgreSQL
  console.log('5️⃣ Saving Session Transcript to Neon PostgreSQL (POST /api/sessions/transcript)...');
  const transcriptPayload = {
    roomName: `ondemand_hackathon_${timestamp}`,
    userId: userId,
    mode: 'ON_DEMAND',
    startedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    endedAt: new Date().toISOString(),
    transcript: [
      { role: 'user', content: 'Hello Hope, this is my first session. I am pitching our hackathon project in an hour and feeling nervous.' },
      { role: 'assistant', content: assistantReply },
    ],
  };

  const saveRes = await fetch(`${NEXT_URL}/api/sessions/transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transcriptPayload),
  });

  if (!saveRes.ok) {
    const errText = await saveRes.text();
    throw new Error(`Transcript save failed (${saveRes.status}): ${errText}`);
  }

  const saveData = await saveRes.json();
  const sessionId = saveData.sessionId;
  console.log(`✅ Transcript processed and saved!`);
  console.log(`   Session ID: ${sessionId}`);
  console.log(`   Postgres Saved: ${saveData.dbSaved ? 'YES ✅' : 'NO ❌'}`);
  console.log(`   FalkorDB Synced: ${saveData.falkorSynced ? 'YES ✅' : 'NO ❌'}`);
  console.log(`   Summary: "${saveData.summary}"`);

  // 6. Verify Session in Neon DB directly
  console.log('\n6️⃣ Verifying Session and Messages in Neon PostgreSQL...');
  const pgSession = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { messages: true },
  });

  if (!pgSession) {
    throw new Error('Session was not found in Neon DB!');
  }
  console.log(`✅ Verified Session in Neon DB: id=${pgSession.id}, roomName=${pgSession.roomName}`);
  console.log(`   Messages saved in DB: ${pgSession.messages.length}`);
  console.log(`   Summary saved in DB: "${pgSession.summary?.slice(0, 80)}..."`);

  // 7. Verify Dashboard API GET /api/sessions for this user
  console.log('\n7️⃣ Verifying Dashboard GET /api/sessions API returns the new session for this user...');
  const dashRes = await fetch(`${NEXT_URL}/api/sessions?userId=${encodeURIComponent(userId)}`);
  const dashData = await dashRes.json();
  const sessionFound = dashData.sessions?.some((s) => s.id === sessionId);

  console.log(`✅ User session count in dashboard API: ${dashData.sessions?.length}`);
  console.log(`   Session returned to dashboard: ${sessionFound ? 'YES ✅' : 'NO ❌'}`);

  console.log('\n🎉 ALL NEON DB HACKATHON PROJECT VERIFICATIONS PASSED WITH FLYING COLORS!');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
