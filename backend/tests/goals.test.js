import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import {
  calculateGoalCurrentAmount,
  calculateGoalProgress,
  enrichGoal,
  addContribution,
  createGoal,
  deleteContribution,
  restoreContribution,
} from '../services/goals.js';

describe('Domain: Metas & Contribuições (Pure Functions)', () => {
  test('calculateGoalCurrentAmount retorna 0 para meta sem contribuições', () => {
    assert.equal(calculateGoalCurrentAmount(null), 0);
    assert.equal(calculateGoalCurrentAmount({}), 0);
    assert.equal(calculateGoalCurrentAmount({ contributions: [] }), 0);
  });

  test('calculateGoalCurrentAmount soma apenas aportes ativos e pagos', () => {
    const goal = {
      contributions: [
        { amount: 500, type: 'deposit', isPaid: true, status: 'active' },
        { amount: 300, type: 'deposit', isPaid: false, status: 'active' }, // pendente
        { amount: 200, type: 'deposit', isPaid: true, status: 'deleted' }, // excluído
        { amount: 150, isPaid: true, status: 'active' }, // legado sem type (padrão deposit)
      ],
    };
    // 500 + 150 = 650
    assert.equal(calculateGoalCurrentAmount(goal), 650);
  });

  test('calculateGoalCurrentAmount subtrai resgates ativos e pagos', () => {
    const goal = {
      contributions: [
        { amount: 1000, type: 'deposit', isPaid: true, status: 'active' },
        { amount: 400, type: 'withdrawal', isPaid: true, status: 'active' }, // resgate pago
        { amount: 100, type: 'withdrawal', isPaid: false, status: 'active' }, // resgate pendente (ignorado)
        { amount: 200, type: 'withdrawal', isPaid: true, status: 'deleted' }, // resgate excluído (ignorado)
      ],
    };
    // 1000 - 400 = 600
    assert.equal(calculateGoalCurrentAmount(goal), 600);
  });

  test('calculateGoalCurrentAmount nunca retorna valor negativo', () => {
    const goal = {
      contributions: [
        { amount: 500, type: 'deposit', isPaid: true, status: 'active' },
        { amount: 800, type: 'withdrawal', isPaid: true, status: 'active' },
      ],
    };
    assert.equal(calculateGoalCurrentAmount(goal), 0);
  });

  test('calculateGoalProgress calcula o percentual correto', () => {
    assert.equal(calculateGoalProgress(0, 1000), 0);
    assert.equal(calculateGoalProgress(500, 1000), 50);
    assert.equal(calculateGoalProgress(1000, 1000), 100);
    assert.equal(calculateGoalProgress(1250, 1000), 125);
    assert.equal(calculateGoalProgress(500, 0), 0);
    assert.equal(calculateGoalProgress(500, -100), 0);
  });

  test('enrichGoal mapeia transactionId e sincroniza isPaid com a transação', () => {
    const goalDoc = {
      _id: 'goal-1',
      name: 'Reserva',
      targetAmount: 2000,
      contributions: [
        { _id: 'c1', amount: 500, type: 'deposit', isPaid: false, status: 'active' },
      ],
    };

    const transactions = [
      {
        _id: 'tx-999',
        savingsGoalId: 'goal-1',
        savingsGoalContributionId: 'c1',
        isPaid: true, // Na transação já foi pago
      },
    ];

    const enriched = enrichGoal(goalDoc, transactions);
    assert.equal(enriched.id, 'goal-1');
    assert.equal(enriched.contributions[0].transactionId, 'tx-999');
    assert.equal(enriched.contributions[0].isPaid, true);
    assert.equal(enriched.currentAmount, 500);
    assert.equal(enriched.progress, 25);
  });
});

describe('Business Rules: Regras de Validação e Consistência', () => {
  function createMockGoalModel(initialGoal) {
    let storedGoal = initialGoal ? {
      ...initialGoal,
      toObject() { return { ...this }; },
      save: async function () { return this; },
      contributions: initialGoal.contributions ? initialGoal.contributions.map(c => ({
        ...c,
        _id: c._id || 'contrib-' + Math.random(),
      })) : [],
    } : null;

    if (storedGoal && storedGoal.contributions) {
      storedGoal.contributions.id = function (cid) {
        return this.find(c => (c._id?.toString?.() || c.id?.toString?.()) === cid);
      };
    }

    return {
      findById: async (id) => storedGoal,
      save: async () => storedGoal,
    };
  }

  function createMockModels(goalData, shouldTxFail = false) {
    const goalDoc = {
      _id: 'goal-123',
      name: 'Viagem Europa',
      targetAmount: 5000,
      currentAmount: goalData?.currentAmount ?? 1000,
      contributions: goalData?.contributions ?? [
        { _id: 'c-init', amount: 1000, type: 'deposit', isPaid: true, status: 'active' }
      ],
    };
    goalDoc.toObject = function () { return { ...this }; };
    goalDoc.save = async function () { return this; };
    goalDoc.contributions.id = function (cid) {
      return this.find(c => (c._id?.toString?.() || c.id?.toString?.()) === cid);
    };
    const origPush = goalDoc.contributions.push.bind(goalDoc.contributions);
    goalDoc.contributions.push = function (...items) {
      items.forEach(item => {
        if (!item._id) item._id = 'contrib-' + Math.random().toString(36).slice(2);
      });
      return origPush(...items);
    };

    const txSavedList = [];

    const mockSavingsGoal = {
      findById: async (id) => (id === 'goal-123' ? goalDoc : null),
    };

    const mockTransaction = function (data) {
      this.data = data;
      this._id = 'tx-' + Math.random().toString(36).slice(2);
      this.save = async () => {
        if (shouldTxFail) {
          throw new Error('Database write failure simulation');
        }
        txSavedList.push({ ...this.data, _id: this._id });
        return this;
      };
    };
    mockTransaction.findOneAndUpdate = async (filter, update) => {
      return { _id: 'tx-updated', ...update.$set };
    };
    mockTransaction.updateMany = async () => ({ modifiedCount: 1 });

    function mockCategory(data) {
      this._id = 'cat-' + (data.code || 'mock');
      Object.assign(this, data);
      this.save = async () => this;
    }
    mockCategory.findById = async () => null;
    mockCategory.findOne = async (query) => {
      if (query.isSavingsContribution) {
        return { _id: 'cat-aporte', name: 'Aporte', code: 'aporte', isSavingsContribution: true };
      }
      if (query.isSavingsWithdrawal) {
        return { _id: 'cat-resgate', name: 'Resgate de Meta', code: 'resgate_meta', isSavingsWithdrawal: true };
      }
      return null;
    };
    mockCategory.find = async () => [];
    mockCategory.updateOne = async () => ({ modifiedCount: 1 });
    mockCategory.countDocuments = async () => 1;

    return {
      models: {
        SavingsGoal: mockSavingsGoal,
        Transaction: mockTransaction,
        Category: mockCategory,
      },
      goalDoc,
      txSavedList,
    };
  }

  test('addContribution rejeita valores menores ou iguais a zero', async () => {
    const { models } = createMockModels();
    await assert.rejects(
      async () => addContribution(models, 'goal-123', { amount: 0 }),
      { message: 'O valor da movimentação deve ser maior que zero.' }
    );
    await assert.rejects(
      async () => addContribution(models, 'goal-123', { amount: -50 }),
      { message: 'O valor da movimentação deve ser maior que zero.' }
    );
  });

  test('addContribution rejeita aporte que ultrapassa o restante da meta', async () => {
    // meta: target 5000, current 1000 -> restante 4000
    const { models } = createMockModels();
    await assert.rejects(
      async () => addContribution(models, 'goal-123', { amount: 4500, type: 'deposit' }),
      (err) => {
        assert.match(err.message, /Valor do aporte ultrapassa o restante da meta/);
        return true;
      }
    );
  });

  test('addContribution aceita aporte válido e atualiza currentAmount', async () => {
    const { models, goalDoc } = createMockModels();
    const result = await addContribution(models, 'goal-123', { amount: 2000, type: 'deposit' });
    assert.equal(result.currentAmount, 3000);
    assert.equal(result.progress, 60);
    assert.equal(goalDoc.contributions.length, 2);
  });

  test('addContribution rejeita resgate maior que o saldo acumulado na meta', async () => {
    // current 1000 -> tentar sacar 1500
    const { models } = createMockModels();
    await assert.rejects(
      async () => addContribution(models, 'goal-123', { amount: 1500, type: 'withdrawal' }),
      (err) => {
        assert.match(err.message, /Valor do resgate ultrapassa o saldo disponível na meta/);
        return true;
      }
    );
  });

  test('addContribution aceita resgate parcial e reduz saldo da meta', async () => {
    // current 1000 -> sacar 400 -> sobra 600
    const { models } = createMockModels();
    const result = await addContribution(models, 'goal-123', { amount: 400, type: 'withdrawal' });
    assert.equal(result.currentAmount, 600);
    assert.equal(result.progress, 12);
  });

  test('addContribution aceita resgate total e zera a meta', async () => {
    // current 1000 -> sacar 1000 -> sobra 0
    const { models } = createMockModels();
    const result = await addContribution(models, 'goal-123', { amount: 1000, type: 'withdrawal' });
    assert.equal(result.currentAmount, 0);
    assert.equal(result.progress, 0);
  });

  test('addContribution desfaz a contribuição na meta se o salvamento da transação falhar (Rollback)', async () => {
    const { models, goalDoc } = createMockModels(undefined, true /* shouldTxFail = true */);
    const initialContribCount = goalDoc.contributions.length;

    await assert.rejects(
      async () => addContribution(models, 'goal-123', { amount: 500, type: 'deposit' }),
      { message: 'Database write failure simulation' }
    );

    // Rollback garantiu que a contribuição nova não ficou órfã
    assert.equal(goalDoc.contributions.length, initialContribCount);
    assert.equal(goalDoc.currentAmount, 1000);
  });

  test('deleteContribution e restoreContribution alteram status e recalculam saldo', async () => {
    const { models, goalDoc } = createMockModels();
    // Inicia com 1 aporte de 1000
    assert.equal(goalDoc.currentAmount, 1000);

    // Deleta a contribuição 'c-init'
    await deleteContribution(models, 'goal-123', 'c-init');
    assert.equal(goalDoc.contributions[0].status, 'deleted');
    assert.equal(goalDoc.currentAmount, 0);

    // Restaura a contribuição 'c-init'
    await restoreContribution(models, 'goal-123', 'c-init');
    assert.equal(goalDoc.contributions[0].status, 'active');
    assert.equal(goalDoc.currentAmount, 1000);
  });
});

describe('User Scenario: Resgate de Meta 2 Meses Depois (Regime de Caixa & Saldo Congelado)', () => {
  // Simula a lógica de cálculo temporal de balanceCalculations.ts
  function calculateGoalsImpactAtDate(goals, effectiveDate) {
    return goals.reduce((total, goal) => {
      if (goal.status === 'deleted') return total;
      const goalTotal = (goal.contributions || []).reduce((sum, c) => {
        if (c.status === 'deleted' || c.isPaid === false) return sum;
        const cDate = c.date.slice(0, 10);
        if (cDate > effectiveDate) return sum;
        const type = c.type || 'deposit';
        return sum + (type === 'withdrawal' ? -c.amount : c.amount);
      }, 0);
      return total + goalTotal;
    }, 0);
  }

  function calculateCheckingBalance(transactions, categories, effectiveDate) {
    const isGoalMovement = (cat) => cat === 'Aporte' || cat === 'Resgate de Meta';
    const paidTxs = transactions.filter((t) => {
      if (t.status === 'deleted' || !t.isPaid) return false;
      if (isGoalMovement(t.category)) return false;
      return t.date.slice(0, 10) <= effectiveDate;
    });

    const income = paidTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = paidTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return income - expenses;
  }

  test('Cenário 1: Saque parcial (400) 2 meses depois - Saldo de 2 meses atrás permanece 100% congelado', () => {
    // 2 meses atrás: 2026-06-15. Usuário ganha salário 5.000 e aporta 1.000 na meta.
    const initialIncome = { date: '2026-06-05', amount: 5000, type: 'income', isPaid: true, status: 'active' };
    const aporteTx = { date: '2026-06-15', amount: 1000, type: 'expense', category: 'Aporte', isPaid: true, status: 'active' };

    const goal = {
      _id: 'goal-1',
      name: 'Reserva de Emergência',
      targetAmount: 5000,
      contributions: [
        { id: 'c1', date: '2026-06-15', amount: 1000, type: 'deposit', isPaid: true, status: 'active' },
      ],
    };

    const txs = [initialIncome, aporteTx];

    // Saldo em 2026-06-30:
    const impactJun = calculateGoalsImpactAtDate([goal], '2026-06-30');
    const checkingJun = calculateCheckingBalance(txs, [], '2026-06-30');
    const adjustedJun = checkingJun - impactJun;
    assert.equal(impactJun, 1000, 'Impacto da meta em Junho deve ser 1000');
    assert.equal(adjustedJun, 4000, 'Saldo disponível no fim de Junho deve ser 4000 (5000 - 1000)');

    // 2 meses depois: 2026-08-20. Usuário saca 400 da meta.
    const resgateTx = { date: '2026-08-20', amount: 400, type: 'income', category: 'Resgate de Meta', isPaid: true, status: 'active' };
    goal.contributions.push({ id: 'c2', date: '2026-08-20', amount: 400, type: 'withdrawal', isPaid: true, status: 'active' });
    txs.push(resgateTx);

    // Saldo da Meta após resgate:
    const goalCurrentAmount = calculateGoalCurrentAmount(goal);
    assert.equal(goalCurrentAmount, 600, 'Meta agora tem 600 acumulados');

    // Saldo em Agosto (mês atual do resgate):
    const impactAug = calculateGoalsImpactAtDate([goal], '2026-08-31');
    const checkingAug = calculateCheckingBalance(txs, [], '2026-08-31');
    const adjustedAug = checkingAug - impactAug;
    assert.equal(impactAug, 600, 'Impacto acumulado da meta em Agosto é 600 (1000 - 400)');
    assert.equal(adjustedAug, 4400, 'Saldo disponível em Agosto subiu para 4400 (+400 liberados)');

    // CONFERÊNCIA CRUCIAL: O que aconteceu com Junho (2 meses atrás)?
    const impactJunRechecked = calculateGoalsImpactAtDate([goal], '2026-06-30');
    const checkingJunRechecked = calculateCheckingBalance(txs, [], '2026-06-30');
    const adjustedJunRechecked = checkingJunRechecked - impactJunRechecked;
    assert.equal(adjustedJunRechecked, 4000, 'Saldo de Junho permanece ESTRITAMENTE CONGELADO em 4000!');
  });

  test('Cenário 2: Saque total (1000) 2 meses depois - Saldo de 2 meses atrás permanece congelado', () => {
    const goal = {
      _id: 'goal-1',
      name: 'Reserva',
      targetAmount: 2000,
      contributions: [
        { id: 'c1', date: '2026-06-15', amount: 1000, type: 'deposit', isPaid: true, status: 'active' },
        { id: 'c2', date: '2026-08-20', amount: 1000, type: 'withdrawal', isPaid: true, status: 'active' },
      ],
    };

    assert.equal(calculateGoalCurrentAmount(goal), 0, 'Meta foi totalmente resgatada e zerada');
    assert.equal(calculateGoalsImpactAtDate([goal], '2026-06-30'), 1000, 'Em Junho o impacto era 1000');
    assert.equal(calculateGoalsImpactAtDate([goal], '2026-08-31'), 0, 'Em Agosto o impacto é 0 (100% devolvido)');
  });

  test('Cenário 3: Retorno de investimento (1000 principal + 200 rendimento) 2 meses depois', () => {
    // Usuário resgata 1000 da meta e adiciona uma receita de Rendimentos de 200 em Agosto
    const initialIncome = { date: '2026-06-05', amount: 5000, type: 'income', isPaid: true, status: 'active' };
    const aporteTx = { date: '2026-06-15', amount: 1000, type: 'expense', category: 'Aporte', isPaid: true, status: 'active' };
    const resgateTx = { date: '2026-08-20', amount: 1000, type: 'income', category: 'Resgate de Meta', isPaid: true, status: 'active' };
    const rendimentoTx = { date: '2026-08-20', amount: 200, type: 'income', category: 'Rendimentos', isPaid: true, status: 'active' };

    const goal = {
      _id: 'goal-1',
      name: 'Investimento CDB',
      targetAmount: 1000,
      contributions: [
        { id: 'c1', date: '2026-06-15', amount: 1000, type: 'deposit', isPaid: true, status: 'active' },
        { id: 'c2', date: '2026-08-20', amount: 1000, type: 'withdrawal', isPaid: true, status: 'active' },
      ],
    };

    const txs = [initialIncome, aporteTx, resgateTx, rendimentoTx];

    // Em Junho:
    const adjustedJun = calculateCheckingBalance(txs, [], '2026-06-30') - calculateGoalsImpactAtDate([goal], '2026-06-30');
    assert.equal(adjustedJun, 4000, 'Saldo de Junho continua 4000');

    // Em Agosto:
    // checkingBalance = 5000 (salario) + 200 (rendimentos) = 5200
    // goalsImpact = 1000 - 1000 = 0
    // adjustedBalance = 5200 - 0 = 5200!
    const adjustedAug = calculateCheckingBalance(txs, [], '2026-08-31') - calculateGoalsImpactAtDate([goal], '2026-08-31');
    assert.equal(adjustedAug, 5200, 'Saldo em Agosto é 5200 (recuperou os 1000 do aporte + ganhou 200 de lucro)');
  });
});
