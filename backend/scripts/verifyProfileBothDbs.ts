import prisma from '../db/index.js';
import falkor from '../db/falkor.js';

async function verify(): Promise<void> {
  console.log('--- Checking PostgreSQL ---');
  const users = await prisma.user.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 3,
  });
  console.log('Postgres recent users:', users.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    bio: u.bio,
    focusAreas: u.focusAreas,
    onboardingComplete: u.onboardingComplete,
  })));

  console.log('--- Checking FalkorDB ---');
  try {
    const g = await falkor.getGraph();
    const fRes = await g.query(`
      MATCH (u:User)
      OPTIONAL MATCH (u)-[:FOCUSES_ON]->(f:FocusArea)
      RETURN u.id, u.name, u.bio, u.focusAreas, u.onboardingComplete, collect(f.name) AS focusNodes
      LIMIT 3
    `);
    console.log('FalkorDB users:', fRes.data || (fRes as any).result_set);
  } catch (err: any) {
    console.error('FalkorDB query error:', err?.message || err);
  }

  process.exit(0);
}

verify().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
