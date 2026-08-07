import { createLocalDateForStorage } from '../utils/date.js';
import { httpError } from '../utils/httpError.js';
import { resolveCategory } from './categories.js';
import { recalcGoalCurrentAmount } from './transactions.js';

// Código da categoria padrão de contribuição (era a string "Aporte").
const CONTRIBUTION_CODE = 'aporte';

// Lista metas calculando currentAmount dinamicamente a partir das transações
// de contribuição (aporte) e injetando transactionId/isPaid nas contribuições
// (contrato consumido pelo frontend). Lógica copiada do server.js original,
// com a busca por categoria agora baseada no ObjectId resolvido da categoria
// de contribuição (em vez da string "Aporte").
export async function listGoals(models) {
  const { SavingsGoal, Transaction } = models;
  const goals = await SavingsGoal.find();

  // Categoria de contribuição (isSavingsContribution) — resolve/seed por code.
  const aporteCategory = await resolveCategory(models, CONTRIBUTION_CODE, 'expense');

  // Get all contribution transactions to calculate currentAmount dynamically.
  // Casa tanto o ObjectId (pós-migração) quanto a string legada "Aporte"
  // (pré-migração, banco ainda não migrado). Usa $expr/$toString porque a
  // cláusula literal { category: 'Aporte' } lança CastError — category é
  // ObjectId no schema e o Mongoose casta a string no build da query.
  const allAportes = aporteCategory
    ? await Transaction.find({
        $expr: {
          $in: [
            { $toString: '$category' },
            [aporteCategory._id.toString(), 'Aporte'],
          ],
        },
        status: 'active',
      })
    : [];

  const aporteByContributionId = new Map();
  allAportes.forEach(t => {
    if (!t.savingsGoalContributionId) return;
    aporteByContributionId.set(t.savingsGoalContributionId.toString(), {
      transactionId: t._id?.toString(),
      isPaid: t.isPaid === true,
      savingsGoalId: t.savingsGoalId?.toString(),
    });
  });

  const filteredGoals = goals.map(goal => {
    const goalObj = goal.toObject();

    // Calculate currentAmount based on transactions
    const goalAportesPaid = allAportes.filter(t => t.savingsGoalId.toString() === goal._id.toString() && t.isPaid);
    goalObj.currentAmount = goalAportesPaid.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Contributions are still kept in the response for frontend compatibility
    goalObj.contributions = (goalObj.contributions || [])
      .filter(c => c.status === 'active')
      .map(c => {
        const info = aporteByContributionId.get(c._id?.toString?.() || c.id?.toString?.());
        return {
          ...c,
          isPaid: info ? info.isPaid : (c.isPaid !== undefined ? c.isPaid : true),
          transactionId: info ? info.transactionId : undefined,
        };
      });

    return goalObj;
  });

  return filteredGoals;
}

export async function createGoal(models, body) {
  const { SavingsGoal } = models;
  const goalData = {
    ...body,
    deadline: body.deadline ? createLocalDateForStorage(body.deadline) : undefined,
  };
  const goal = new SavingsGoal(goalData);
  return await goal.save();
}

// Atualiza uma meta, incluindo restauração (status active) que também
// restaura contribuições e transações relacionadas. Retorna null se não achar.
export async function updateGoal(models, id, body) {
  const { SavingsGoal, Transaction } = models;
  const { name, targetAmount, deadline, status } = body;
  const goal = await SavingsGoal.findById(id);
  if (!goal) return null;

  if (name) goal.name = name;
  if (targetAmount !== undefined) goal.targetAmount = targetAmount;
  if (deadline !== undefined) goal.deadline = createLocalDateForStorage(deadline);

  // Handle restoration
  if (status === 'active' && goal.status === 'deleted') {
    goal.status = 'active';
    goal.deletedAt = null;
    // Also restore all contributions
    if (goal.contributions) {
      goal.contributions.forEach(c => {
        if (c.status === 'deleted') {
          c.status = 'active';
          c.deletedAt = null;
        }
      });
    }

    // Also restore all related transactions
    await Transaction.updateMany(
      { savingsGoalId: goal._id, status: 'deleted' },
      { $set: { status: 'active', deletedAt: null } }
    );
  } else if (status) {
    goal.status = status;
  }

  await goal.save();
  return goal;
}

// Soft-delete de uma meta, suas contribuições e transações relacionadas.
export async function deleteGoal(models, id) {
  const { SavingsGoal, Transaction } = models;
  const goal = await SavingsGoal.findById(id);
  if (!goal) return null;

  const now = new Date();
  goal.status = 'deleted';
  goal.deletedAt = now;

  // Mark all contributions as deleted too
  if (goal.contributions && goal.contributions.length > 0) {
    goal.contributions.forEach(contrib => {
      if (contrib.status !== 'deleted') {
        contrib.status = 'deleted';
        contrib.deletedAt = now;
      }
    });
  }

  // Mark all related transactions as deleted too
  await Transaction.updateMany(
    { savingsGoalId: goal._id, status: 'active' },
    { $set: { status: 'deleted', deletedAt: now } }
  );

  await goal.save();
  return goal;
}

// Descrição padrão de uma transação de contribuição, usando o
// descriptionTemplate da categoria quando disponível.
async function contributionDescription(models, goalName) {
  const aporteCategory = await resolveCategory(models, CONTRIBUTION_CODE, 'expense');
  if (aporteCategory?.descriptionTemplate) {
    return aporteCategory.descriptionTemplate.replace('${goal.name}', goalName);
  }
  return `Aporte: ${goalName}`;
}

// Adiciona uma contribuição manual e cria a transação de aporte correspondente.
export async function addContribution(models, goalId, body) {
  const { SavingsGoal, Transaction } = models;
  const goal = await SavingsGoal.findById(goalId);
  if (!goal) {
    throw httpError(404, 'Savings goal not found');
  }

  const { amount, date } = body;
  const contributionDate = date ? createLocalDateForStorage(date) : new Date();

  const contribution = {
    amount,
    date: contributionDate,
    isPaid: true,
    status: 'active'
  };

  goal.contributions.push(contribution);
  const savedGoal = await goal.save();

  // Get the newly created contribution ID
  const newContrib = savedGoal.contributions[savedGoal.contributions.length - 1];

  // Categoria de contribuição e meio de pagamento resolvidos por code (não
  // mais strings hardcoded "Aporte"/"Saldo em Conta").
  const aporteCategory = await resolveCategory(models, CONTRIBUTION_CODE, 'expense');
  const paymentMethod = await resolveCategory(models, 'saldo_conta', 'payment_method');

  // Create a corresponding transaction
  const newTransaction = new Transaction({
    description: await contributionDescription(models, goal.name),
    amount: amount,
    type: 'expense',
    category: aporteCategory ? aporteCategory._id : undefined,
    date: contributionDate,
    isPaid: true,
    paymentMethod: paymentMethod ? paymentMethod._id : undefined,
    savingsGoalId: goal._id,
    savingsGoalContributionId: newContrib._id.toString(),
    status: 'active'
  });

  await newTransaction.save();

  // Calculate current amount for the goal (legacy field update)
  await recalcGoalCurrentAmount(models, goal);
  await goal.save();

  return goal;
}

// Atualiza uma contribuição e a transação correspondente.
export async function updateContribution(models, goalId, contributionId, body) {
  const { SavingsGoal, Transaction } = models;
  const goal = await SavingsGoal.findById(goalId);
  if (!goal) {
    throw httpError(404, 'Goal not found');
  }

  const contribution = goal.contributions.id(contributionId);
  if (!contribution || contribution.status === 'deleted') {
    throw httpError(404, 'Contribution not found');
  }

  const newAmount = body.amount;
  const newDate = body.date ? createLocalDateForStorage(body.date) : contribution.date;

  contribution.amount = newAmount;
  contribution.date = newDate;

  // Update the corresponding transaction
  await Transaction.findOneAndUpdate(
    { savingsGoalContributionId: contributionId },
    {
      amount: newAmount,
      date: newDate,
      description: await contributionDescription(models, goal.name)
    }
  );

  // Recalcular currentAmount considerando as transações ativas
  await recalcGoalCurrentAmount(models, goal);
  await goal.save();
  return goal;
}

// Soft-delete de uma contribuição e da transação correspondente.
export async function deleteContribution(models, goalId, contributionId) {
  const { SavingsGoal, Transaction } = models;
  const goal = await SavingsGoal.findById(goalId);
  if (!goal) {
    throw httpError(404, 'Goal not found');
  }

  const contribution = goal.contributions.id(contributionId);
  if (!contribution || contribution.status === 'deleted') {
    throw httpError(404, 'Contribution not found');
  }

  const now = new Date();
  // Soft delete na contribuição
  contribution.status = 'deleted';
  contribution.deletedAt = now;

  // Soft delete na transação correspondente
  await Transaction.findOneAndUpdate(
    { savingsGoalContributionId: contributionId },
    {
      status: 'deleted',
      deletedAt: now
    }
  );

  // Recalcular currentAmount
  await recalcGoalCurrentAmount(models, goal);
  await goal.save();
  return goal;
}
