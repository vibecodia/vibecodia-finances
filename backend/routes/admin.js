import { Router } from 'express';

import { getModels } from '../db/models/index.js';
import { dbMiddleware } from '../middleware/dbMiddleware.js';

// Rotas de administração/migração (legado). Lógica preservada do server.js.
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
          description: `Aporte: ${goal.name}`,
          amount: contrib.amount,
          type: 'expense',
          category: 'Aporte',
          date: contrib.date,
          isPaid: true,
          paymentMethod: 'Saldo em Conta',
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

  return router;
}
