import falkor from '../db/falkor.js';

async function main() {
  console.log('🧹 [FalkorDB Clear] Connecting to FalkorDB...');
  try {
    const res = await falkor.clearAll();
    console.log('✅ [FalkorDB Clear]', res.message);
    console.log('⚡ [FalkorDB Clear] Reinitializing multi-tenant isolated schema indices...');
    await falkor.initIndices();
    console.log('✅ [FalkorDB Clear] Indices successfully reinitialized!');
    process.exit(0);
  } catch (err) {
    console.error('❌ [FalkorDB Clear Error]:', err.message);
    process.exit(1);
  }
}

main();
