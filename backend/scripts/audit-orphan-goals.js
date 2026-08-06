// Auditoria de savingsGoalId órfão em transações (F7).
//
// Read-only. Lista transações com savingsGoalId cujo vínculo de meta está
// quebrado: meta inexistente/deletada, transaction sem savingsGoalContributionId
// (half-link) ou contributionId que não bate com nenhuma contribuição da meta
// (nem ativa, nem deletada).
//
// Uso (herda MONGO_CONN_MAP da própria app):
//   docker exec -w /app/backend financial-app-backend node scripts/audit-orphan-goals.js
import { pathToFileURL } from 'node:url';

import { loadEnv } from '../config/env.js';
import ConnectionManager from '../db/connectionManager.js';
import { getModels } from '../db/models/index.js';

async function main() {
  const { dbConnMap } = loadEnv();
  const manager = new ConnectionManager(dbConnMap);
  const conn = manager.getConnection('139');
  await new Promise((resolve, reject) => {
    conn.once('connected', resolve);
    conn.once('error', reject);
  });
  console.log('Banco conectado:', conn.name);

  const { Transaction, SavingsGoal } = getModels(conn);

  const txWithGoal = await Transaction.find({
    savingsGoalId: { $exists: true, $ne: null },
  });
  const goals = await SavingsGoal.find({});
  const goalById = new Map(goals.map((g) => [g._id.toString(), g]));

  const counts = { goalMissing: 0, halfLink: 0, contribMissing: 0, contribDeleted: 0, valid: 0 };
  const details = { goalMissing: [], halfLink: [], contribMissing: [], contribDeleted: [] };

  for (const t of txWithGoal) {
    const gid = t.savingsGoalId?.toString();
    const cid = t.savingsGoalContributionId ? String(t.savingsGoalContributionId) : null;
    const goal = gid ? goalById.get(gid) : undefined;
    const desc = (t.description || '').slice(0, 45);
    const status = t.status;
    const isPaid = t.isPaid;

    if (!goal) {
      counts.goalMissing++;
      details.goalMissing.push({ desc, gid, cid, status, isPaid });
      continue;
    }
    if (!cid) {
      counts.halfLink++;
      details.halfLink.push({ desc, gid, cid, status, isPaid });
      continue;
    }
    const found = (goal.contributions || []).find((c) => c._id?.toString() === cid);
    if (!found) {
      counts.contribMissing++;
      details.contribMissing.push({ desc, gid, cid, status, isPaid });
    } else if (found.status === 'deleted') {
      counts.contribDeleted++;
      details.contribDeleted.push({ desc, gid, cid, status, isPaid, goalStatus: goal.status });
    } else {
      counts.valid++;
    }
  }

  console.log(`\nTransações com savingsGoalId: ${txWithGoal.length}`);
  console.log(`Metas no banco: ${goals.length} (deletadas: ${goals.filter((g) => g.status === 'deleted').length})`);
  console.log(`  válidas (contrib ativa):       ${counts.valid}`);
  console.log(`  meta NÃO existe:               ${counts.goalMissing}`);
  console.log(`  sem savingsGoalContributionId: ${counts.halfLink}`);
  console.log(`  contrib não existe na meta:    ${counts.contribMissing}`);
  console.log(`  contrib deletada na meta:      ${counts.contribDeleted}`);

  for (const [k, arr] of Object.entries(details)) {
    if (!arr.length) continue;
    console.log(`\n--- ${k} ---`);
    for (const d of arr) {
      console.log(`  [${d.status}] paid=${d.isPaid} ${d.desc} goal=${d.gid} contrib=${d.cid}`);
    }
  }

  await conn.close();
  process.exit(0);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((err) => {
    console.error('ERRO:', err.message || err);
    process.exit(1);
  });
}
