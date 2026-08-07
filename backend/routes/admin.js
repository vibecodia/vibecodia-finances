import { Router } from 'express';

import { getModels } from '../db/models/index.js';
import { dbMiddleware } from '../middleware/dbMiddleware.js';
import {
  ensureDefaultCategories,
  resolveCategory,
} from '../services/categories.js';

const isObjectIdString = (v) =>
  typeof v === 'string' && /^[0-9a-f]{24}$/i.test(v);

// Rotas de administração/migração (legado). Lógica preservada do server.js,
// adaptada para o modelo de categorias (ObjectId no lugar de strings).
export function adminRouter(connectionManager) {
  const router = Router();
  // dbMiddleware por rota (como no original) para não vazar para outras rotas /api
  const requireDb = dbMiddleware(connectionManager);

  router.get('/migrate-status', requireDb, async (req, res) => {
    const { Transaction, SavingsGoal } = getModels(req.conn);

    // Atualiza Transactions
    const resT = await Transaction.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'active', deletedAt: null } }
    );

    // Atualiza SavingsGoal
    const resS = await SavingsGoal.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'active', deletedAt: null } }
    );

    // Update individual contributions that don't have status
    const allGoals = await SavingsGoal.find({ 'contributions.status': { $exists: false } });
    let contributionsUpdated = 0;
    for (const goal of allGoals) {
      let modified = false;
      goal.contributions.forEach(c => {
        if (!c.status) {
          c.status = 'active';
          c.deletedAt = null;
          modified = true;
          contributionsUpdated++;
        }
      });
      if (modified) await goal.save();
    }

    res.json({
      message: 'Migração concluída com sucesso!',
      transactionsUpdated: resT.modifiedCount,
      goalsUpdated: resS.modifiedCount,
      contributionsUpdated
    });
  });

  router.get('/migrate-contributions', requireDb, async (req, res) => {
    const { Transaction, SavingsGoal } = getModels(req.conn);

    // Categoria de contribuição e meio de pagamento resolvidos por code
    // (substitui as strings "Aporte"/"Saldo em Conta").
    const aporteCategory = await resolveCategory(getModels(req.conn), 'aporte', 'expense');
    const paymentMethod = await resolveCategory(getModels(req.conn), 'saldo_conta', 'payment_method');

    const allGoals = await SavingsGoal.find();
    let createdTransactions = 0;
    let skippedTransactions = 0;

    for (const goal of allGoals) {
      if (!goal.contributions || goal.contributions.length === 0) continue;

      for (const contrib of goal.contributions) {
        // Check if transaction already exists for this contribution
        const existing = await Transaction.findOne({
          savingsGoalId: goal._id,
          savingsGoalContributionId: contrib._id.toString()
        });

        if (existing) {
          skippedTransactions++;
          continue;
        }

        // Create new transaction
        const newTransaction = new Transaction({
          description: aporteCategory?.descriptionTemplate
            ? aporteCategory.descriptionTemplate.replace('${goal.name}', goal.name)
            : `Aporte: ${goal.name}`,
          amount: contrib.amount,
          type: 'expense',
          category: aporteCategory ? aporteCategory._id : undefined,
          date: contrib.date,
          isPaid: true,
          paymentMethod: paymentMethod ? paymentMethod._id : undefined,
          savingsGoalId: goal._id,
          savingsGoalContributionId: contrib._id.toString(),
          status: contrib.status || 'active',
          deletedAt: contrib.deletedAt
        });

        await newTransaction.save();
        createdTransactions++;
      }
    }

    res.json({
      message: 'Migração de contribuições concluída!',
      createdTransactions,
      skippedTransactions
    });
  });

  // Migra categorias/meios de pagamento legados (strings) para ObjectId ref.
  // Idempotente: transações já com ObjectId são ignoradas. Deve ser rodado uma
  // vez por banco após o deploy desta versão.
  router.get('/migrate-categories', requireDb, async (req, res) => {
    const { Transaction } = getModels(req.conn);

    await ensureDefaultCategories(getModels(req.conn));

    // .lean() é OBRIGATÓRIO aqui: dados legados guardam a categoria como string
    // ("Aporte", "PIX"...), e o campo é ObjectId no schema. Com docs hidratados
    // a string não sobrevive à hidratação (vira undefined), então o loop nunca
    // enxergaria o valor legado. .lean() devolve o valor cru gravado no Mongo.
    const transactions = await Transaction.find({}).lean();
    let categoriesUpdated = 0;
    let paymentMethodsUpdated = 0;

    for (const t of transactions) {
      if (typeof t.category === 'string' && !isObjectIdString(t.category)) {
        const cat = await resolveCategory(getModels(req.conn), t.category, t.type);
        if (cat) {
          await Transaction.updateOne({ _id: t._id }, { $set: { category: cat._id } });
          categoriesUpdated++;
        }
      }
      if (typeof t.paymentMethod === 'string' && !isObjectIdString(t.paymentMethod)) {
        const pm = await resolveCategory(getModels(req.conn), t.paymentMethod, 'payment_method');
        if (pm) {
          await Transaction.updateOne({ _id: t._id }, { $set: { paymentMethod: pm._id } });
          paymentMethodsUpdated++;
        }
      }
    }

    res.json({
      message: 'Migração de categorias concluída!',
      categoriesUpdated,
      paymentMethodsUpdated
    });
  });

  return router;
}
