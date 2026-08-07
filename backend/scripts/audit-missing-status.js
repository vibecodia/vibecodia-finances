// Auditoria de documentos sem campo `status` (backfill de status).
//
// O código refatorado filtra `status: 'active'` ao listar transações, metas e
// contribuições. Documentos legados sem o campo `status` ficam invisíveis na
// UI. Este script conta esses documentos (read-only por padrão) e, com
// `--apply`, faz o backfill do campo — espelhando GET /api/admin/migrate-status.
//
// NÃO cria nem altera transações — apenas adiciona o campo `status` (e
// `deletedAt: null`) onde ele está ausente. Valores/datas/saldos não mudam.
//
// Por que .lean(): o subschema de contribuições define `status` com default
// 'active'; na hidratação o Mongoose aplica esse default ao ler do banco,
// MASCARANDO o campo ausente (mesma armadilha da string→ObjectId de category
// no migrate-categories.js). Com .lean() vemos o valor cru gravado no Mongo.
//
// `status: null` (ou '') é reportado como informativo, mas NÃO é corrigido:
// a rota /api/admin/migrate-status só trata `{ status: { $exists: false } }`.
// Avaliar manualmente se existirem.
//
// Uso (credenciais do cluster via ambiente — NUNCA hardcode a senha no repo):
//   DB_USER=... DB_PASS=... node backend/scripts/audit-missing-status.js [nome_do_banco]
//   DB_USER=... DB_PASS=... node backend/scripts/audit-missing-status.js household_db          # audit (read-only)
//   DB_USER=... DB_PASS=... node backend/scripts/audit-missing-status.js household_db --apply  # backfill
import { pathToFileURL } from 'node:url';

import mongoose from 'mongoose';

import { getModels } from '../db/models/index.js';

// Credenciais do cluster via ambiente (DB_USER/DB_PASS obrigatórios; DB_CLUSTER
// opcional). A senha NUNCA fica hardcoded no código — se entrar no arquivo, vai
// parar no git (o .gitignore só cobre .env).
const USER = process.env.DB_USER;
const SENHA = process.env.DB_PASS;
const CLUSTER = process.env.DB_CLUSTER || 'cluster0.u8x8t.mongodb.net';
const DB = process.argv[2] || 'household_db_dodo';
const APPLY = process.argv.includes('--apply');

const uri = `mongodb+srv://${USER}:${SENHA}@${CLUSTER}/${DB}?retryWrites=true&w=majority`;
const SAMPLE_LIMIT = 10;

if (!USER || !SENHA) {
  console.error('Faltam credenciais: defina DB_USER e DB_PASS no ambiente (DB_CLUSTER opcional).');
  console.error('Não hardcode a senha do banco no código — ela iria para o git.');
  process.exit(1);
}

// Classifica um valor de status lido cru (.lean): ausente (undefined) →
// corrigível; falsy (null/'') → informativo, a rota não corrige.
const classify = (doc) => {
  if (doc.status === undefined) return 'missing';
  if (!doc.status) return 'falsy';
  return null;
};

// Coleta amostras (id + rótulo) até SAMPLE_LIMIT por bucket.
function collectSample(bucket, doc, label) {
  if (bucket.length < SAMPLE_LIMIT) {
    bucket.push({ id: doc._id?.toString(), label });
  }
}

async function main() {
  console.log(`Conectando em ${CLUSTER}/${DB}${APPLY ? ' (APPLY — vai gravar)' : ' (read-only)'}...`);
  const conn = await mongoose
    .createConnection(uri, { serverSelectionTimeoutMS: 10000 })
    .asPromise();
  const { Transaction, SavingsGoal } = getModels(conn);

  // --- Transactions --------------------------------------------------------
  // `{ status: null }` casa elementos ausentes E null (igualdade com null);
  // `''` cobre string vazia. Classificamos a diferença em JS.
  const txDocs = await Transaction.find({ $or: [{ status: null }, { status: '' }] }).lean();
  const txMissing = [];
  const txFalsy = [];
  for (const t of txDocs) {
    const kind = classify(t);
    if (kind === 'missing') {
      txMissing.push(t);
      collectSample(txMissing, t, (t.description || t._id).slice(0, 40));
    } else if (kind === 'falsy') {
      txFalsy.push(t);
    }
  }

  // --- SavingsGoal ----------------------------------------------------------
  const goalDocs = await SavingsGoal.find({ $or: [{ status: null }, { status: '' }] }).lean();
  const goalMissing = [];
  const goalFalsy = [];
  for (const g of goalDocs) {
    const kind = classify(g);
    if (kind === 'missing') {
      goalMissing.push(g);
      collectSample(goalMissing, g, g.name);
    } else if (kind === 'falsy') {
      goalFalsy.push(g);
    }
  }

  // --- Contribuições dentro das metas ---------------------------------------
  const goalsWithBadContribs = await SavingsGoal.find({
    $or: [{ 'contributions.status': null }, { 'contributions.status': '' }],
  }).lean();
  let contribMissing = 0;
  let contribFalsy = 0;
  const contribSamples = [];
  for (const goal of goalsWithBadContribs) {
    for (const c of goal.contributions || []) {
      const kind = classify(c);
      if (kind === 'missing') {
        contribMissing++;
        collectSample(contribSamples, c, `${goal.name} · contrib ${c._id}`);
      } else if (kind === 'falsy') {
        contribFalsy++;
      }
    }
  }

  console.log('\nStatus ausente (corrigível pela rota migrate-status / --apply):');
  console.log(`  transactions:    ${txMissing.length}`);
  console.log(`  savings_goals:   ${goalMissing.length}`);
  console.log(`  contribuições:   ${contribMissing}`);
  if (txMissing.length) {
    console.log('    amostras:');
    for (const s of txMissing) console.log(`      - ${s.label}`);
  }
  if (goalMissing.length) {
    console.log('    amostras:');
    for (const s of goalMissing) console.log(`      - ${s.label}`);
  }
  if (contribMissing) {
    console.log('    amostras:');
    for (const s of contribSamples) console.log(`      - ${s.label}`);
  }

  console.log('\nStatus presente mas falsy (null/\'\' — a rota NÃO corrige; avaliar manualmente):');
  console.log(`  transactions:    ${txFalsy.length}`);
  console.log(`  savings_goals:   ${goalFalsy.length}`);
  console.log(`  contribuições:   ${contribFalsy}`);

  const anyFixable = txMissing.length > 0 || goalMissing.length > 0 || contribMissing > 0;

  if (!APPLY) {
    console.log(`\nDRY-RUN (read-only): nenhuma gravação feita. Rode com --apply para backfill.${anyFixable ? '' : ' Nada a corrigir.'}`);
    await conn.close();
    process.exit(0);
  }

  if (!anyFixable) {
    console.log('\nNada a corrigir.');
    await conn.close();
    process.exit(0);
  }

  // --- Backfill (espelha /api/admin/migrate-status) --------------------------
  const resT = await Transaction.updateMany(
    { status: { $exists: false } },
    { $set: { status: 'active', deletedAt: null } },
  );
  const resS = await SavingsGoal.updateMany(
    { status: { $exists: false } },
    { $set: { status: 'active', deletedAt: null } },
  );

  // Contribuições: update posicional por elemento (só status + deletedAt),
  // sem reescrever o array inteiro — não toca amount/date/isPaid/extra fields.
  let contribApplied = 0;
  for (const goal of goalsWithBadContribs) {
    for (const c of goal.contributions || []) {
      if (classify(c) !== 'missing') continue;
      if (!c._id) {
        console.warn(`  Aviso: contribuição sem _id na meta ${goal.name} — pular.`);
        continue;
      }
      await SavingsGoal.updateOne(
        { _id: goal._id, 'contributions._id': c._id },
        { $set: { 'contributions.$.status': 'active', 'contributions.$.deletedAt': null } },
      );
      contribApplied++;
    }
  }

  console.log('\nBackfill aplicado:');
  console.log(`  transactions:    ${resT.modifiedCount}`);
  console.log(`  savings_goals:   ${resS.modifiedCount}`);
  console.log(`  contribuições:   ${contribApplied}`);

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
