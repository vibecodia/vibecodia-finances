import mongoose from 'mongoose';

import { DEFAULT_CATEGORIES, DEFAULT_CATEGORY_BY_CODE } from '../db/seed/categories.js';
import { httpError } from '../utils/httpError.js';

// Gera um slug a partir de um nome: minúsculas, sem acentos, espaços → '_'.
// Usado para criar o `code` de categorias customizadas e para resolver por nome.
export function toCode(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

const isObjectId = (value) =>
  typeof value === 'string' && /^[0-9a-f]{24}$/i.test(value) ||
  value instanceof mongoose.Types.ObjectId;

// Garante que todas as categorias padrão existam na conexão (upsert por code).
// Usa $setOnInsert para NÃO sobrescrever renomeações/edições do usuário.
// Idempotente — pode ser chamado a cada request.
export async function ensureDefaultCategories(models) {
  const { Category } = models;
  let created = 0;
  for (const def of DEFAULT_CATEGORIES) {
    const result = await Category.updateOne(
      { code: def.code },
      { $setOnInsert: def },
      { upsert: true },
    );
    if (result.upsertedCount > 0) created++;
  }
  return { created, total: DEFAULT_CATEGORIES.length };
}

// Lista categorias ativas (despesas/receitas/meios de pagamento).
export async function listCategories(models, type) {
  const { Category } = models;
  const query = { status: 'active' };
  if (type) query.type = type;
  return Category.find(query).sort({ order: 1, name: 1 });
}

// Cria uma categoria customizada. `code` é gerado do nome se não informado.
export async function createCategory(models, body) {
  const { Category } = models;
  const name = String(body.name || '').trim();
  if (!name) throw httpError(400, 'Nome da categoria é obrigatório.');

  const type = body.type || 'expense';
  const code = body.code ? String(body.code).trim() : toCode(name);
  if (!code) throw httpError(400, 'Código da categoria inválido.');

  const existing = await Category.findOne({ $or: [{ code }, { name }] });
  if (existing) throw httpError(409, `Categoria "${name}" já existe.`);

  const category = new Category({
    name,
    code,
    type,
    emoji: body.emoji || '',
    color: body.color || '#6366f1',
    isSavingsContribution: Boolean(body.isSavingsContribution),
    isPassiveIncome: Boolean(body.isPassiveIncome),
    isBenefit: Boolean(body.isBenefit),
    includeInBalance: body.includeInBalance !== false,
    isSystem: Boolean(body.isSystem),
    descriptionTemplate: body.descriptionTemplate || '',
    descriptionSuggestions: Array.isArray(body.descriptionSuggestions)
      ? body.descriptionSuggestions
      : [],
    order: Number(body.order) || 0,
    status: 'active',
  });
  return category.save();
}

// Atualiza campos editáveis de uma categoria. Retorna null se não achar.
export async function updateCategory(models, id, body) {
  const { Category } = models;
  const allowed = [
    'name', 'emoji', 'color', 'order', 'descriptionTemplate',
    'descriptionSuggestions', 'isSavingsContribution', 'isPassiveIncome',
    'isBenefit', 'includeInBalance',
  ];
  const update = {};
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key];
  }
  return Category.findByIdAndUpdate(id, update, { new: true });
}

// Soft-delete de uma categoria. Impede remover categorias em uso (transações
// referenciam via _id) ou sistema (Aporte/Saldo em Conta).
export async function softDeleteCategory(models, id) {
  const { Category, Transaction } = models;
  const category = await Category.findById(id);
  if (!category) return null;
  if (category.isSystem) {
    throw httpError(400, `A categoria "${category.name}" é obrigatória e não pode ser excluída.`);
  }

  const inUse = await Transaction.exists({
    $or: [{ category: category._id }, { paymentMethod: category._id }],
    status: 'active',
  });
  if (inUse) {
    throw httpError(400, `Não é possível excluir a categoria "${category.name}" pois ela está em uso em transações.`);
  }

  category.status = 'deleted';
  category.deletedAt = new Date();
  return category.save();
}

// Resolve o valor de `category`/`paymentMethod` vindo de um request para um
// documento Category. Aceita (backward compatible):
//   - _id (string ou ObjectId) → findById
//   - code  → findOne por code (e auto-seed se for um default)
//   - name  → findOne por name
// Se nada for encontrado, cria uma categoria customizada com o nome informado
// (preserva o comportamento antigo de aceitar qualquer string).
export async function resolveCategory(models, value, type) {
  const { Category } = models;
  if (!value) return null;

  // Aceita o documento/payload completo de categoria também
  // ({ _id } | { code } | { name })
  if (typeof value === 'object' && !(value instanceof mongoose.Types.ObjectId)) {
    value = value._id || value.code || value.name;
  }
  if (!value) return null;

  // 1. _id direto
  if (isObjectId(value)) {
    const byId = await Category.findById(value);
    if (byId) return byId;
    // cai para código/nome abaixo (ex.: string de 24 chars que não é _id)
  }

  const stringValue = String(value).trim();

  // 2. Por código (inclui seeds ainda não criados)
  if (!isObjectId(stringValue)) {
    const byCode = await Category.findOne({ code: stringValue });
    if (byCode) return byCode;

    const defaultDef = DEFAULT_CATEGORY_BY_CODE.get(stringValue);
    if (defaultDef && (!type || defaultDef.type === type)) {
      await ensureDefaultCategories(models);
      const seeded = await Category.findOne({ code: stringValue });
      if (seeded) return seeded;
    }
  }

  // 3. Por nome (dados legados que gravavam o nome da categoria)
  const byName = await Category.findOne({
    name: { $regex: new RegExp(`^${escapeRegExp(stringValue)}$`, 'i') },
    ...(type ? { type } : {}),
  });
  if (byName) return byName;

  // 4. Fallback: cria categoria customizada (comportamento antigo de "qualquer string")
  const code = isObjectId(stringValue) ? toCode(stringValue) : toCode(stringValue);
  const category = new Category({
    name: stringValue,
    code: await uniqueCode(models, code, type),
    type: type || 'expense',
    status: 'active',
  });
  return category.save();
}

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Garante `code` único para categorias customizadas (evita conflito de índice).
async function uniqueCode(models, baseCode, type) {
  const { Category } = models;
  if (!baseCode) return `categoria_${Date.now()}`;
  const existing = await Category.findOne({ code: baseCode, type });
  if (!existing) return baseCode;
  let suffix = 1;
  while (await Category.findOne({ code: `${baseCode}_${suffix}` })) suffix++;
  return `${baseCode}_${suffix}`;
}
