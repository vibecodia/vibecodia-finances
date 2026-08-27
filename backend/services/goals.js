import { createLocalDateForStorage } from '../utils/date.js';
import { httpError } from '../utils/httpError.js';
import { resolveCategory } from './categories.js';

// Códigos das categorias padrão do domínio de metas
const CONTRIBUTION_CODE = 'aporte';
const WITHDRAWAL_CODE = 'resgate_meta';

/**
 * Função Pura: Single Source of Truth para o cálculo do valor acumulado da meta.
 * Considera contribuições ativas e pagas.
 * - 'deposit' (ou sem type): soma ao saldo
 * - 'withdrawal': subtrai do saldo
 */
export function calculateGoalCurrentAmount(goal) {
  if (!goal || !goal.contributions) return 0;
  const total = goal.contributions.reduce((sum, c) => {
    if (c.status === 'deleted' || c.isPaid === false) return sum;
    const type = c.type || 'deposit';
    if (type === 'withdrawal') {
      return sum - (Number(c.amount) || 0);
    }
    return sum + (Number(c.amount) || 0);
  }, 0);
  return Math.max(0, Math.round(total * 100) / 100);
}

/**
 * Função Pura: Progresso percentual da meta
 */
export function calculateGoalProgress(currentAmount, targetAmount) {
  if (!targetAmount || targetAmount <= 0) return 0;
  const pct = (currentAmount / targetAmount) * 100;
  return Math.round(pct * 10) / 10;
}

/**
 * Enriquece o objeto de meta para consumo do frontend e integra com o mapa de transações.
 */
export function enrichGoal(goalDoc, transactions = []) {
  const goalObj = typeof goalDoc?.toObject === 'function' ? goalDoc.toObject() : { ...goalDoc };
  const txMap = new Map();
  transactions.forEach(t => {
    if (t.savingsGoalContributionId) {
      txMap.set(t.savingsGoalContributionId.toString(), t);
    }
  });

  goalObj.id = goalObj._id?.toString() || goalObj.id;
  goalObj.contributions = (goalObj.contributions || []).map(c => {
    const cid = c._id?.toString?.() || c.id?.toString?.();
    const tx = txMap.get(cid);
    return {
      ...c,
      id: cid,
      type: c.type || 'deposit',
      isPaid: tx ? tx.isPaid === true : (c.isPaid !== undefined ? c.isPaid : true),
      transactionId: tx?._id?.toString?.() || c.transactionId,
    };
  });

  goalObj.currentAmount = calculateGoalCurrentAmount(goalObj);
  goalObj.progress = calculateGoalProgress(goalObj.currentAmount, goalObj.targetAmount);
  return goalObj;
}

/**
 * Descrição padrão de uma transação de aporte
 */
async function contributionDescription(models, goalName) {
  const aporteCategory = await resolveCategory(models, CONTRIBUTION_CODE, 'expense');
  if (aporteCategory?.descriptionTemplate) {
    return aporteCategory.descriptionTemplate.replace('${goal.name}', goalName);
  }
  return `Aporte: ${goalName}`;
}

/**
 * Descrição padrão de uma transação de resgate
 */
async function withdrawalDescription(models, goalName) {
  const resgateCategory = await resolveCategory(models, WITHDRAWAL_CODE, 'income');
  if (resgateCategory?.descriptionTemplate) {
    return resgateCategory.descriptionTemplate.replace('${goal.name}', goalName);
  }
  return `Resgate: ${goalName}`;
}

/**
 * Lista todas as metas calculando currentAmount de forma centralizada e
 * vinculando com as transações ativas.
 */
export async function listGoals(models) {
  const { SavingsGoal, Transaction } = models;
  const goals = await SavingsGoal.find();

  // Busca todas as transações vinculadas às metas listadas
  const goalIds = goals.map(g => g._id);
  const allGoalTransactions = await Transaction.find({
    savingsGoalId: { $in: goalIds },
    status: 'active',
  });

  return goals.map(goal => enrichGoal(goal, allGoalTransactions));
}

export async function createGoal(models, body) {
  const { SavingsGoal } = models;
  const targetAmount = Number(body.targetAmount);
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    throw httpError(400, 'O valor objetivo da meta deve ser maior que zero.');
  }

  const goalData = {
    ...body,
    name: body.name?.trim(),
    targetAmount,
    currentAmount: 0,
    deadline: body.deadline ? createLocalDateForStorage(body.deadline) : undefined,
    contributions: [],
  };
  if (!goalData.name) {
    throw httpError(400, 'O nome da meta é obrigatório.');
  }

  const goal = new SavingsGoal(goalData);
  const saved = await goal.save();
  return enrichGoal(saved, []);
}

export async function updateGoal(models, id, body) {
  const { SavingsGoal, Transaction } = models;
  const goal = await SavingsGoal.findById(id);
  if (!goal) return null;

  const { name, targetAmount, deadline, status } = body;

  if (name !== undefined) {
    const trimmed = name?.trim();
    if (!trimmed) throw httpError(400, 'O nome da meta não pode ser vazio.');
    goal.name = trimmed;
  }

  if (targetAmount !== undefined) {
    const num = Number(targetAmount);
    if (!Number.isFinite(num) || num <= 0) {
      throw httpError(400, 'O valor objetivo da meta deve ser maior que zero.');
    }
    goal.targetAmount = num;
  }

  if (deadline !== undefined) {
    goal.deadline = deadline ? createLocalDateForStorage(deadline) : undefined;
  }

  // Restauração de meta
  if (status === 'active' && goal.status === 'deleted') {
    goal.status = 'active';
    goal.deletedAt = null;

    if (goal.contributions) {
      goal.contributions.forEach(c => {
        if (c.status === 'deleted') {
          c.status = 'active';
          c.deletedAt = null;
        }
      });
    }

    await Transaction.updateMany(
      { savingsGoalId: goal._id, status: 'deleted' },
      { $set: { status: 'active', deletedAt: null } }
    );
  } else if (status) {
    goal.status = status;
  }

  goal.currentAmount = calculateGoalCurrentAmount(goal);
  await goal.save();

  const relatedTransactions = await Transaction.find({ savingsGoalId: goal._id, status: 'active' });
  return enrichGoal(goal, relatedTransactions);
}

export async function deleteGoal(models, id) {
  const { SavingsGoal, Transaction } = models;
  const goal = await SavingsGoal.findById(id);
  if (!goal) return null;

  const now = new Date();
  goal.status = 'deleted';
  goal.deletedAt = now;

  if (goal.contributions && goal.contributions.length > 0) {
    goal.contributions.forEach(contrib => {
      if (contrib.status !== 'deleted') {
        contrib.status = 'deleted';
        contrib.deletedAt = now;
      }
    });
  }

  await Transaction.updateMany(
    { savingsGoalId: goal._id, status: 'active' },
    { $set: { status: 'deleted', deletedAt: now } }
  );

  await goal.save();
  return goal;
}

/**
 * Adiciona uma movimentação à meta (Aporte ou Resgate) com validação rígida
 * e atomicidade com rollback manual se a transação falhar.
 */
export async function addContribution(models, goalId, body) {
  const { SavingsGoal, Transaction } = models;
  const goal = await SavingsGoal.findById(goalId);
  if (!goal) {
    throw httpError(404, 'Meta de economia não encontrada.');
  }
  if (goal.status === 'deleted') {
    throw httpError(400, 'Não é possível movimentar uma meta excluída.');
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw httpError(400, 'O valor da movimentação deve ser maior que zero.');
  }

  const type = body.type === 'withdrawal' ? 'withdrawal' : 'deposit';
  const isWithdrawal = type === 'withdrawal';
  const currentAccumulated = calculateGoalCurrentAmount(goal);

  if (isWithdrawal) {
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

  const contributionDate = body.date ? createLocalDateForStorage(body.date) : new Date();
  const isPaid = body.isPaid !== undefined ? Boolean(body.isPaid) : true;

  const contribution = {
    amount,
    date: contributionDate,
    type,
    isPaid,
    notes: body.notes || undefined,
    status: 'active'
  };

  goal.contributions.push(contribution);
  const savedGoal = await goal.save();
  const newContrib = savedGoal.contributions[savedGoal.contributions.length - 1];

  const category = isWithdrawal
    ? await resolveCategory(models, WITHDRAWAL_CODE, 'income')
    : await resolveCategory(models, CONTRIBUTION_CODE, 'expense');
  const paymentMethod = await resolveCategory(models, 'saldo_conta', 'payment_method');

  let newTransaction;
  try {
    const newContribId = (newContrib._id || newContrib.id)?.toString?.();

    newTransaction = new Transaction({
      description: isWithdrawal
        ? await withdrawalDescription(models, goal.name)
        : await contributionDescription(models, goal.name),
      amount,
      type: isWithdrawal ? 'income' : 'expense',
      category: category ? category._id : undefined,
      date: contributionDate,
      isPaid,
      paymentMethod: paymentMethod ? paymentMethod._id : undefined,
      savingsGoalId: goal._id,
      savingsGoalContributionId: newContribId,
      status: 'active'
    });

    await newTransaction.save();
  } catch (err) {
    // Rollback: desfaz a contribuição inserida no goal
    const newContribId = (newContrib._id || newContrib.id)?.toString?.();
    goal.contributions = goal.contributions.filter(c => (c._id || c.id)?.toString?.() !== newContribId);
    goal.currentAmount = calculateGoalCurrentAmount(goal);
    await goal.save();
    throw err;
  }

  goal.currentAmount = calculateGoalCurrentAmount(goal);
  await goal.save();

  return enrichGoal(goal, newTransaction ? [newTransaction] : []);
}

/**
 * Atualiza uma contribuição / resgate e sincroniza a transação correspondente.
 */
export async function updateContribution(models, goalId, contributionId, body) {
  const { SavingsGoal, Transaction } = models;
  const goal = await SavingsGoal.findById(goalId);
  if (!goal) {
    throw httpError(404, 'Meta não encontrada.');
  }

  const contribution = goal.contributions.id(contributionId);
  if (!contribution) {
    throw httpError(404, 'Movimentação não encontrada.');
  }

  // Restauração de contribuição excluída
  if (body.status === 'active' && contribution.status === 'deleted') {
    contribution.status = 'active';
    contribution.deletedAt = null;

    await Transaction.findOneAndUpdate(
      { savingsGoalContributionId: contributionId },
      { $set: { status: 'active', deletedAt: null } }
    );
  }

  if (body.amount !== undefined) {
    const newAmount = Number(body.amount);
    if (!Number.isFinite(newAmount) || newAmount <= 0) {
      throw httpError(400, 'O valor da movimentação deve ser maior que zero.');
    }
    contribution.amount = newAmount;
  }

  if (body.date) {
    contribution.date = createLocalDateForStorage(body.date);
  }

  if (body.isPaid !== undefined) {
    contribution.isPaid = Boolean(body.isPaid);
  }

  if (body.notes !== undefined) {
    contribution.notes = body.notes;
  }

  const txUpdate = {
    amount: contribution.amount,
    date: contribution.date,
    isPaid: contribution.isPaid,
  };
  if (contribution.status === 'active') {
    txUpdate.status = 'active';
    txUpdate.deletedAt = null;
  }

  const tx = await Transaction.findOneAndUpdate(
    { savingsGoalContributionId: contributionId },
    { $set: txUpdate },
    { new: true }
  );

  goal.currentAmount = calculateGoalCurrentAmount(goal);
  await goal.save();

  return enrichGoal(goal, tx ? [tx] : []);
}

/**
 * Exclusão lógica (soft delete) da contribuição e transação vinculada.
 */
export async function deleteContribution(models, goalId, contributionId) {
  const { SavingsGoal, Transaction } = models;
  const goal = await SavingsGoal.findById(goalId);
  if (!goal) {
    throw httpError(404, 'Meta não encontrada.');
  }

  const contribution = goal.contributions.id(contributionId);
  if (!contribution || contribution.status === 'deleted') {
    throw httpError(404, 'Movimentação não encontrada ou já excluída.');
  }

  const now = new Date();
  contribution.status = 'deleted';
  contribution.deletedAt = now;

  const tx = await Transaction.findOneAndUpdate(
    { savingsGoalContributionId: contributionId },
    { $set: { status: 'deleted', deletedAt: now } },
    { new: true }
  );

  goal.currentAmount = calculateGoalCurrentAmount(goal);
  await goal.save();

  return enrichGoal(goal, tx ? [tx] : []);
}

/**
 * Restaura uma contribuição/resgate previamente excluído.
 */
export async function restoreContribution(models, goalId, contributionId) {
  return updateContribution(models, goalId, contributionId, { status: 'active' });
}

