import prisma from '../db/index.js';

async function test() {
  try {
    console.log('Testing connection to Neon DB...');
    const result = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
    console.log('✅ Successfully connected to Neon PostgreSQL!');
    console.log('Result:', result);

    const userCount = await prisma.user.count();
    const sessionCount = await prisma.session.count();
    const messageCount = await prisma.message.count();

    console.log(`📊 Neon DB Table Counts:`);
    console.log(`   - Users: ${userCount}`);
    console.log(`   - Sessions: ${sessionCount}`);
    console.log(`   - Messages: ${messageCount}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Connection failed:', err);
    process.exit(1);
  }
}

test();
