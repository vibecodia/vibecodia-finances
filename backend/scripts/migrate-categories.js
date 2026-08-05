// Migra categorias/meios de pagamento legados (strings) → ObjectId refs
// diretamente em um banco MongoDB (padrão: household_db_dodo).
//
// Mesmo comportamento da rota /api/admin/migrate-categories (idempotente).
// NÃO cria nem altera transações — só troca a representação da categoria
// ("Aporte" → ObjectId da categoria Aporte no cadastro). Nenhum valor/datа
// de transação muda, então o saldo verdadeiro permanece idêntico.
//
// Por que .lean() aqui: a versão refatorada declara category/paymentMethod
// como ObjectId. Ler com docs hidratados DESCARTARIA a string legada (ela
// vira undefined — é a causa raiz das categorias "undefined" e do saldo
// −100k). Com .lean() enxergamos o valor cru gravado no Mongo.
//
// Uso:
//   node backend/scripts/migrate-categories.js [nome_do_banco] [--dry-run]
//   node backend/scripts/migrate-categories.js household_db_dodo --dry-run
import { pathToFileURL } from 'node:url';

import mongoose from 'mongoose';

import { getModels } from '../db/models/index.js';
import {
  ensureDefaultCategories,
  resolveCategory,
} from '../services/categories.js';

// Mesmos defaults do clone_db.sh (podem ser sobrescritos via env).
const USER = process.env.DB_USER;
const SENHA = process.env.DB_PASS;
const CLUSTER = process.env.DB_CLUSTER || 'cluster0.u8x8t.mongodb.net';
const DB = process.argv[2] || 'household_db_dodo';
const DRY_RUN = process.argv.includes('--dry-run');

const uri = `mongodb+srv://${USER}:${SENHA}@${CLUSTER}/${DB}?retryWrites=true&w=majority`;
const isObjectIdStr = (v) =>
  typeof v === 'string' && /^[0-9a-f]{24}$/i.test(v);
const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Resolução read-only (dry-run): espelha os passos 1–3 do resolveCategory
// (findById → por code → por name case-insensitive), mas NÃO executa o passo
// 4 (criar categoria customizada). Devolve { category, wouldCreate }.
async function resolveReadOnly(models, value, type) {
  const { Category } = models;
  if (!value) return null;
  if (typeof value === 'object' && !(value instanceof mongoose.Types.ObjectId)) {
    value = value._id || value.code || value.name;
  }
  if (!value) return null;

  if (isObjectIdStr(value) || value instanceof mongoose.Types.ObjectId) {
    const byId = await Category.findById(value);
    if (byId) return { category: byId, wouldCreate: false };
  }

  const stringValue = String(value).trim();
  const byCode = await Category.findOne({ code: stringValue });
  if (byCode) return { category: byCode, wouldCreate: false };

  const byName = await Category.findOne({
    name: { $regex: new RegExp(`^${escapeRegExp(stringValue)}$`, 'i') },
    ...(type ? { type } : {}),
  });
  if (byName) return { category: byName, wouldCreate: false };

  return { category: null, wouldCreate: true }; // resolveCategory criaria custom
}

async function main() {
  console.log(`Conectando em ${CLUSTER}/${DB}${DRY_RUN ? ' (DRY-RUN — nada será gravado)' : ''}...`);
  const conn = await mongoose
    .createConnection(uri, { serverSelectionTimeoutMS: 10000 })
    .asPromise();
  const models = getModels(conn);
  const { Transaction } = models;

  if (!DRY_RUN) {
    const seeded = await ensureDefaultCategories(models);
    console.log(`Defaults garantidos: ${seeded.total} (criados: ${seeded.created})`);
  }

  // .lean() é OBRIGATÓRIO: devolve a string legada como está no Mongo.
  const transactions = await Transaction.find({}).lean();
  console.log(`${transactions.length} transações lidas (raw).`);

  let categoriesUpdated = 0;
  let paymentMethodsUpdated = 0;
  const unknown = new Set();

  for (const t of transactions) {
    if (typeof t.category === 'string' && !isObjectIdStr(t.category)) {
      const resolved = DRY_RUN
        ? await resolveReadOnly(models, t.category, t.type)
        : { category: await resolveCategory(models, t.category, t.type) };
      if (resolved?.category) {
        categoriesUpdated++;
        if (!DRY_RUN) {
          await Transaction.updateOne(
            { _id: t._id },
            { $set: { category: resolved.category._id } },
          );
        }
      } else if (resolved?.wouldCreate) {
        unknown.add(t.category);
      }
    }

    if (typeof t.paymentMethod === 'string' && !isObjectIdStr(t.paymentMethod)) {
      const resolved = DRY_RUN
        ? await resolveReadOnly(models, t.paymentMethod, 'payment_method')
        : { category: await resolveCategory(models, t.paymentMethod, 'payment_method') };
      if (resolved?.category) {
        paymentMethodsUpdated++;
        if (!DRY_RUN) {
          await Transaction.updateOne(
            { _id: t._id },
            { $set: { paymentMethod: resolved.category._id } },
          );
        }
      } else if (resolved?.wouldCreate) {
        unknown.add(`pagamento: ${t.paymentMethod}`);
      }
    }
  }

  console.log('Resultado:');
  console.log(`  categorias a atualizar: ${categoriesUpdated}`);
  console.log(`  meios de pagamento a atualizar: ${paymentMethodsUpdated}`);
  if (unknown.size > 0) {
    console.log('  Legados sem default (virariam categoria customizada):');
    for (const name of unknown) console.log(`    - ${name}`);
  }
  if (DRY_RUN) {
    console.log('DRY-RUN: nenhuma gravação feita. Rode sem --dry-run para aplicar.');
  }

  await conn.close();
  process.exit(0);
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((err) => {
    console.error('ERRO:', err.message || err);
    process.exit(1);
  });
}
