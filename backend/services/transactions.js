import { createLocalDateForStorage } from '../utils/date.js';
import { httpError } from '../utils/httpError.js';
import { logger } from '../utils/logger.js';

import { resolveCategory } from './categories.js';
import { calculateGoalCurrentAmount } from './goals.js';

// Recalcula currentAmount de uma meta a partir da função centralizada de domínio.
export async function recalcGoalCurrentAmount(models, goal) {
  goal.currentAmount = calculateGoalCurrentAmount(goal);
}

// Cria uma transação. Se a categoria resolvida for uma contribuição de meta
// (flag isSavingsContribution — antes era a string "Aporte"), valida a meta,
// registra a contribuição e mantém goal.currentAmount em sincronia.
export async function createTransaction(models, body) {
  const { Transaction, SavingsGoal } = models;

  const requestedGoalId = body.savingsGoalId || body.goalId;
  const amount = Number(body.amount);

  // Resolve categoria e meio de pagamento para ObjectId. Aceita _id, code ou
  // name (legado) — preserva compatibilidade com clientes antigos.
  const category = await resolveCategory(models, body.category, body.type);
  const paymentMethod = await resolveCategory(
    models,
    body.paymentMethod || 'pix',
    'payment_method',
  );
  const isAporte = category?.isSavingsContribution === true;
  const isResgate = category?.isSavingsWithdrawal === true;
  const isGoalMovement = isAporte || isResgate;

  const transactionData = {
    ...body,
    category: category ? category._id : undefined,
    paymentMethod: paymentMethod ? paymentMethod._id : undefined,
    date: createLocalDateForStorage(body.date),
    dueDate: body.dueDate ? createLocalDateForStorage(body.dueDate) : undefined,
  };

  if (isGoalMovement) {
    if (!requestedGoalId) {
      throw httpError(400, isResgate
        ? 'Para a categoria de resgate, o campo goalId/savingsGoalId é obrigatório.'
        : 'Para a categoria de aporte, o campo goalId/savingsGoalId é obrigatório.'
      );
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw httpError(400, 'Valor da movimentação inválido.');
    }
  } else {
    delete transactionData.savingsGoalId;
    delete transactionData.goalId;
    delete transactionData.savingsGoalContributionId;
  }

  if (isGoalMovement) {
    const goal = await SavingsGoal.findById(requestedGoalId);
    if (!goal || goal.status === 'deleted') {
      throw httpError(404, 'Meta não encontrada ou inativa.');
    }

    const currentAccumulated = calculateGoalCurrentAmount(goal);

    if (isResgate) {
      if (amount > currentAccumulated) {
        throw httpError(400, `Valor do resgate ultrapassa o saldo disponível na meta. Disponível: ${currentAccumulated}.`, {
          available: currentAccumulated,
        });
      }
    } else {
      const remaining = (goal.targetAmount || 0) - currentAccumulated;
      if (remaining <= 0) {
        throw httpError(400, 'Esta meta já atingiu o valor total. Não é possível adicionar novos aportes.');
      }
      if (amount > remaining) {
        throw httpError(400, `Valor do aporte ultrapassa o restante da meta. Restante disponível: ${remaining}.`, {
          remaining,
        });
      }
    }

    goal.contributions.push({
      amount,
      date: transactionData.date || new Date(),
      type: isResgate ? 'withdrawal' : 'deposit',
      isPaid: transactionData.isPaid === true,
      status: 'active'
    });

    await goal.save();
    const newContribution = goal.contributions[goal.contributions.length - 1];

    transactionData.savingsGoalId = goal._id;
    transactionData.savingsGoalContributionId = newContribution._id.toString();

    try {
      const newTransaction = await new Transaction(transactionData).save();
      goal.currentAmount = calculateGoalCurrentAmount(goal);
      await goal.save();
      return newTransaction.populate(['category', 'paymentMethod']);
    } catch (err) {
      goal.contributions = goal.contributions.filter(c => c._id.toString() !== newContribution._id.toString());
      goal.currentAmount = calculateGoalCurrentAmount(goal);
      await goal.save();
      throw err;
    }
  }

  const newTransaction = await new Transaction(transactionData).save();
  return newTransaction.populate(['category', 'paymentMethod']);
}

// Atualiza uma transação e, se a categoria for contribuição de meta, sincroniza
// a contribuição. Retorna null quando não encontrada (rota responde 404).
export async function updateTransaction(models, id, body) {
  const { Transaction } = models;

  const updateData = {
    ...body,
  };

  if (body.category !== undefined) {
    const category = await resolveCategory(models, body.category, body.type);
    if (category) updateData.category = category._id;
  }
  if (body.paymentMethod !== undefined) {
    const paymentMethod = await resolveCategory(models, body.paymentMethod, 'payment_method');
    if (paymentMethod) updateData.paymentMethod = paymentMethod._id;
  }

  if (body.date) {
    updateData.date = createLocalDateForStorage(body.date);
  }
  if (body.dueDate !== undefined) {
    updateData.dueDate = body.dueDate ? createLocalDateForStorage(body.dueDate) : undefined;
  }

  const updatedTransaction = await Transaction.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  ).populate('category').populate('paymentMethod');

  if (!updatedTransaction) {
    return null;
  }

  const isGoalMovement =
    updatedTransaction.category?.isSavingsContribution === true ||
    updatedTransaction.category?.isSavingsWithdrawal === true;
  const goalId = updatedTransaction.savingsGoalId;
  const contributionId = updatedTransaction.savingsGoalContributionId;

  if (isGoalMovement && goalId && contributionId) {
    await syncContributionFromTransaction(models, updatedTransaction, body);
  } else if (!isGoalMovement && (goalId || contributionId)) {
    // Categoria deixou de ser meta (ou nunca foi e sobraram vínculos) →
    // remove a contribuição da meta e TODOS os vínculos da transação
    await Transaction.updateOne(
      { _id: id },
      { $set: { savingsGoalId: null, savingsGoalContributionId: null } },
    );
    updatedTransaction.savingsGoalId = null;
    updatedTransaction.savingsGoalContributionId = null;

    if (goalId && contributionId) {
      await syncContributionFromTransaction(
        models,
        { savingsGoalId: goalId, savingsGoalContributionId: contributionId },
        { status: 'deleted' },
      );
    }
  }

  return updatedTransaction;
}

// Soft-delete de uma transação e, se for vinculada a meta, sincroniza.
// Retorna null quando não encontrada (rota responde 404).
export async function deleteTransaction(models, id) {
  const { Transaction } = models;
  const now = new Date();
  const deletedTransaction = await Transaction.findByIdAndUpdate(
    id,
    { status: 'deleted', deletedAt: now },
    { new: true }
  ).populate('category');

  if (!deletedTransaction) {
    return null;
  }

  const isGoalMovement =
    deletedTransaction.category?.isSavingsContribution === true ||
    deletedTransaction.category?.isSavingsWithdrawal === true;

  if (
    isGoalMovement &&
    deletedTransaction.savingsGoalId &&
    deletedTransaction.savingsGoalContributionId
  ) {
    await syncContributionFromTransaction(models, deletedTransaction, { status: 'deleted' });
  }

  return deletedTransaction;
}

// Sincroniza a contribuição de uma meta com a transação de aporte
// correspondente. Centraliza a lógica duplicada de PUT e DELETE
// /api/transactions/:id (e a busca refinada por .id()/string).
async function syncContributionFromTransaction(models, updatedTransaction, changes) {
  const { SavingsGoal } = models;

  const goal = await SavingsGoal.findById(updatedTransaction.savingsGoalId);
  if (!goal) {
    logger.debug(`[sync contribution] Goal NOT found with ID: ${updatedTransaction.savingsGoalId}`);
    return;
  }

  // Refined search: try both .id() and manual find by string
  let contribution = goal.contributions.id(updatedTransaction.savingsGoalContributionId);
  if (!contribution) {
    contribution = goal.contributions.find(c => c._id.toString() === updatedTransaction.savingsGoalContributionId.toString());
  }

  if (!contribution) {
    logger.debug(`[sync contribution] Contribution NOT found in goal. ContribID searched: ${updatedTransaction.savingsGoalContributionId}`);
    logger.debug(`[sync contribution] Available contrib IDs: ${goal.contributions.map(c => c._id.toString()).join(', ')}`);
    return;
  }

  let modified = false;

  if (changes.amount !== undefined && contribution.amount !== updatedTransaction.amount) {
    contribution.amount = updatedTransaction.amount;
    modified = true;
  }

  if (changes.date !== undefined && contribution.date.toISOString() !== updatedTransaction.date.toISOString()) {
    contribution.date = updatedTransaction.date;
    modified = true;
  }

  if (changes.isPaid !== undefined && contribution.isPaid !== updatedTransaction.isPaid) {
    contribution.isPaid = updatedTransaction.isPaid;
    modified = true;
  }

  // Se houve restauração da transação
  if (changes.status === 'active' && contribution.status === 'deleted') {
    logger.debug(`[sync contribution] RESTORING contribution in goal.`);
    contribution.status = 'active';
    contribution.deletedAt = null;
    modified = true;
  }

  // Se houve exclusão via status
  if (changes.status === 'deleted' && contribution.status !== 'deleted') {
    logger.debug(`[sync contribution] DELETING contribution in goal via status update.`);
    contribution.status = 'deleted';
    contribution.deletedAt = new Date();
    modified = true;
  }

  if (modified) {
    await recalcGoalCurrentAmount(models, goal);
    await goal.save();
    logger.debug(`[sync contribution] Goal ${goal.name} updated successfully.`);
  }
}
