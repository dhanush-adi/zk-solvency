/**
 * seed-data.js — Seed the backend DB with realistic proof rounds
 * 
 * Calls the backend's /api/proof/simulate endpoint to generate
 * accounts and proof rounds with real Merkle roots.
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function seed() {
  console.log('🌱 Seeding ZK-Solvency data...');
  console.log(`   API: ${API_URL}\n`);

  const rounds = [
    { accountCount: 50, label: 'Round 1 — 50 accounts' },
    { accountCount: 75, label: 'Round 2 — 75 accounts' },
    { accountCount: 100, label: 'Round 3 — 100 accounts' },
  ];

  for (const round of rounds) {
    console.log(`📦 Creating: ${round.label}`);
    try {
      const res = await fetch(`${API_URL}/api/proof/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountCount: round.accountCount }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`   ❌ Failed (${res.status}): ${text}`);
        continue;
      }

      const data = await res.json();
      console.log(`   ✅ Round ${data.roundNumber || '?'} created`);
      console.log(`      Merkle Root: ${data.merkleRoot?.slice(0, 24)}...`);
      console.log(`      Accounts: ${data.accountCount || round.accountCount}`);
      console.log(`      Total Balance: ${data.totalBalance}\n`);
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
    }
  }

  // Also seed solvency history via the solvency simulate endpoint 
  console.log('📊 Seeding solvency history...');
  try {
    const res = await fetch(`${API_URL}/api/solvency/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountCount: 50 }),
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`   ✅ Solvency round created (root: ${data.merkleRoot?.slice(0, 24)}...)\n`);
    }
  } catch (err) {
    console.log(`   ⚠️  Solvency simulate endpoint not available (non-critical)\n`);
  }

  console.log('╔══════════════════════════════════════════╗');
  console.log('║         SEEDING COMPLETE ✅              ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('\nTest with:');
  console.log('  curl http://localhost:3001/api/proof/latest');
  console.log('  curl http://localhost:3001/api/solvency/history');
  console.log('  curl -X POST http://localhost:3001/api/inclusion-proof/verify \\');
  console.log('    -H "Content-Type: application/json" \\');
  console.log('    -d \'{"userId":"user_5","signature":"demo"}\'');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
