// Limpeza de savingsGoalId órfão em transações (F7).
//
// Identifica transações cujo vínculo de meta está quebrado — meta inexistente,
// contributionId que não existe na meta (nem como deletada) ou half-link
// (savingsGoalId sem savingsGoalContributionId) — e limpa os campos
// savingsGoalId/savingsGoalContributionId. Não mexe em vínculos consistentes
// (contribuição deletada junto com a transação).
//
// Uso:
//   docker exec -w /app/backend financial-app-backend \
//     node scripts/cleanup-orphan-goals.js          # dry-run (padrão)
//   docker exec -w /app/backend financial-app-backend \
//     node scripts/cleanup-orphan-goals.js --apply  # aplica
import { pathToFileURL } from 'node:url';

import { loadEnv } from '../config/env.js';
import ConnectionManager from '../db/connectionManager.js';
import { getModels } from '../db/models/index.js';

async function main() {
  const apply = process.argv.includes('--apply');
  const { dbConnMap } = loadEnv();
  const manager = new ConnectionManager(dbConnMap);
  const conn = manager.getConnection('139');
  await new Promise((resolve, reject) => {
    conn.once('connected', resolve);
    conn.once('error', reject);
  });
  console.log('Banco conectado:', conn.name);
  console.log(`Modo: ${apply ? 'APLICAR' : 'DRY-RUN (use --apply para aplicar)'}`);

  const { Transaction, SavingsGoal } = getModels(conn);

  const txWithGoal = await Transaction.find({
    savingsGoalId: { $exists: true, $ne: null },
  });
  const goals = await SavingsGoal.find({});
  const goalById = new Map(goals.map((g) => [g._id.toString(), g]));

  const orphans = [];
  for (const t of txWithGoal) {
    const gid = t.savingsGoalId?.toString();
    const cid = t.savingsGoalContributionId ? String(t.savingsGoalContributionId) : null;
    const goal = gid ? goalById.get(gid) : undefined;
    if (!goal) {
      orphans.push({ t, reason: 'meta inexistente', gid, cid });
      continue;
    }
    if (!cid) {
      orphans.push({ t, reason: 'half-link (sem contributionId)', gid, cid });
      continue;
    }
    const found = (goal.contributions || []).some((c) => c._id?.toString() === cid);
    if (!found) {
      orphans.push({ t, reason: 'contribuição não existe na meta', gid, cid });
    }
  }

  console.log(`\nÓrfãos encontrados: ${orphans.length}`);
  for (const { t, reason, gid, cid } of orphans) {
    console.log(`  [${t.status}] ${reason} | ${(t.description || '').slice(0, 40)} | goal=${gid} contrib=${cid}`);
  }

  if (!orphans.length) {
    console.log('Nada a fazer.');
    await conn.close();
    process.exit(0);
  }

  if (!apply) {
    console.log('\nNenhuma alteração feita.');
    await conn.close();
    process.exit(0);
  }

  const ids = orphans.map(({ t }) => t._id);
  const res = await Transaction.updateMany(
    { _id: { $in: ids } },
    { $set: { savingsGoalId: null, savingsGoalContributionId: null } },
  );
  console.log(`\nAplicado: ${res.modifiedCount} transações limpas.`);
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
