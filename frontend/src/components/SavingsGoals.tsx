import React, { useState } from 'react';
import { SavingsGoal, SavingsContribution } from '../types';
import { formatCurrency, formatBrazilDate, getBrazilDateString } from '../utils/helpers';
import { Target, Plus, Trash2, Edit3, Calendar, TrendingUp, History, X } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';

interface SavingsGoalsProps {
  goals: SavingsGoal[];
  onAdd: (goal: Omit<SavingsGoal, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, updates: Partial<SavingsGoal>) => void;
  onDelete: (id: string) => void;
  onAddContribution: (goalId: string, amount: number, date?: string) => void;
  onUpdateContribution: (goalId: string, contributionId: string, updates: Partial<SavingsContribution>) => void;
  onDeleteContribution: (goalId: string, contributionId: string) => void;
}

const SavingsGoals: React.FC<SavingsGoalsProps> = ({ 
  goals, 
  onAdd, 
  onUpdate, 
  onDelete, 
  onAddContribution,
  onUpdateContribution,
  onDeleteContribution
}) => {
  const { theme } = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    deadline: '',
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

  const openDeleteModal = (id: string) => {
    setGoalToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setGoalToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (goalToDelete) {
      onDelete(goalToDelete);
    }
    closeDeleteModal();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.targetAmount) {
      return;
    }

    const goalData = {
      name: formData.name,
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: 0, // Always start with 0, contributions will be added separately
      deadline: formData.deadline || undefined,
      contributions: [], // Initialize with empty contributions
    };

    if (editingGoal) {
      onUpdate(editingGoal, goalData);
      setEditingGoal(null);
    } else {
      onAdd(goalData);
    }

    setFormData({ name: '', targetAmount: '', deadline: '' });
    setShowForm(false);
  };

  const handleEdit = (goal: SavingsGoal) => {
    const deadline = goal.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : '';
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      deadline: deadline,
    });
    setEditingGoal(goal.id);
    setShowForm(true);
  };

  const totalGoals = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalSaved = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-text mb-1 truncate">
            Metas de Economia
          </h2>
          {goals.length > 0 && (
            <p className="text-sm text-text opacity-90 truncate">
              Total: <span className="font-medium">{formatCurrency(totalSaved)} / {formatCurrency(totalGoals)}</span>
            </p>
          )}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="p-3 text-white rounded-full shadow-lg transition-all hover:scale-105 flex-shrink-0 bg-primary hover:bg-secondary"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.cardBorder }}>
              <Target className="w-8 h-8 text-text opacity-70" />
            </div>
            <p className="text-text opacity-90 mb-4">Nenhuma meta cadastrada</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 text-white rounded-xl font-medium transition-colors bg-primary hover:bg-secondary"
            >
              Criar primeira meta
            </button>
          </div>
        ) : (
          goals.map((goal) => {
            const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            const isComplete = progress >= 100;
            
            return (
              <GoalCard 
                key={goal.id}
                goal={goal}
                progress={progress}
                isComplete={isComplete}
                onEdit={() => handleEdit(goal)}
                onDelete={() => openDeleteModal(goal.id)}
                onAddContribution={onAddContribution}
                onUpdateContribution={onUpdateContribution}
                onDeleteContribution={onDeleteContribution}
              />
            );
          })
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl w-full max-w-md p-6" style={{ backgroundColor: theme.cardBackground }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-text truncate pr-2">
                {editingGoal ? 'Editar Meta' : 'Nova Meta'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingGoal(null);
                  setFormData({ name: '', targetAmount: '', deadline: '' });
                }}
                className="p-2 rounded-full transition-colors hover:bg-cardBorder"
              >
                <X className="w-5 h-5 text-text" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Nome da Meta
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Viagem para o Japão"
                  className="w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Valor da Meta (R$)
                </label>
                <input
                  type="number"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetAmount: e.target.value }))}
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className="w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Prazo (Opcional)
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingGoal(null);
                    setFormData({ name: '', targetAmount: '', deadline: '' });
                  }}
                  className="flex-1 px-4 py-3 rounded-xl transition-colors hover:bg-cardBorder"
                  style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 text-white rounded-xl font-medium transition-colors bg-primary hover:bg-secondary"
                >
                  {editingGoal ? 'Salvar' : 'Criar Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteConfirm}
        title="Confirmar Exclusão"
        message="Tem certeza de que deseja excluir esta meta de economia? Esta ação não pode ser desfeita."
      />
    </div>
  );
};

// Goal Card Component
interface GoalCardProps {
  goal: SavingsGoal;
  progress: number;
  isComplete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddContribution: (goalId: string, amount: number, date?: string) => void;
  onUpdateContribution: (goalId: string, contributionId: string, updates: Partial<SavingsContribution>) => void;
  onDeleteContribution: (goalId: string, contributionId: string) => void;
}

const GoalCard: React.FC<GoalCardProps> = ({ 
  goal, 
  progress, 
  isComplete, 
  onEdit, 
  onDelete, 
  onAddContribution,
  onUpdateContribution,
  onDeleteContribution
}) => {
  const { theme } = useTheme();
  const [showAddAmount, setShowAddAmount] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [contributionDate, setContributionDate] = useState(getBrazilDateString());
  const [editingContribution, setEditingContribution] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');

  const handleAddAmount = () => {
    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    onAddContribution(goal.id, amount, contributionDate);
    setAddAmount('');
    setContributionDate(getBrazilDateString());
    setShowAddAmount(false);
  };

  const handleEditContribution = (contribution: SavingsContribution) => {
    setEditingContribution(contribution.id);
    setEditAmount(contribution.amount.toString());
    const formattedDate = contribution.date ? new Date(contribution.date).toISOString().split('T')[0] : '';
    setEditDate(formattedDate);
  };

  const handleUpdateContribution = () => {
    if (!editingContribution) return;
    
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    onUpdateContribution(goal.id, editingContribution, {
      amount,
      date: editDate,
    });
    
    setEditingContribution(null);
    setEditAmount('');
    setEditDate('');
  };

  const handleDeleteContribution = (contributionId: string) => {
    if (confirm('Tem certeza que deseja excluir este aporte?')) {
      onDeleteContribution(goal.id, contributionId);
    }
  };

  const remainingAmount = goal.targetAmount - goal.currentAmount;

  // Sort contributions by date (most recent first)
  const sortedContributions = (goal.contributions || [])
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className={cn(`border rounded-2xl p-6 transition-all`)}
      style={{ 
        backgroundColor: theme.cardBackground,
        borderColor: isComplete ? theme.primary : theme.cardBorder,
        boxShadow: isComplete ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' // Default shadow
      }}
    >
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text mb-1 truncate">
            {goal.name}
          </h3>
          {goal.deadline && (
            <p className="text-sm text-text opacity-90 truncate">
              Prazo: {formatBrazilDate(new Date(goal.deadline))}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {sortedContributions.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 rounded-lg transition-colors text-text hover:text-primary hover:bg-cardBorder"
              title="Ver histórico de aportes"
            >
              <History className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-2 rounded-lg transition-colors text-text hover:text-primary hover:bg-cardBorder"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg transition-colors text-text hover:text-accent hover:bg-cardBorder"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-text opacity-90 truncate pr-2">Progresso</span>
          <span className="font-medium flex-shrink-0" style={{ color: theme.text }}>
            {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
          </span>
        </div>
        <div className="w-full rounded-full h-3" style={{ backgroundColor: theme.cardBorder }}>
          <div 
            className={`h-3 rounded-full transition-all duration-500`}
            style={{ 
              backgroundColor: isComplete ? theme.primary : theme.accent,
              width: `${Math.min(progress, 100)}%` 
            }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className={`font-medium ${isComplete ? 'text-primary' : 'text-accent'}`}>
            {progress.toFixed(1)}%
          </span>
          {!isComplete && (
            <span className="text-text opacity-70 truncate pl-2">
              Faltam {formatCurrency(remainingAmount)}
            </span>
          )}
        </div>
      </div>

      {/* Contributions History */}
      {showHistory && sortedContributions.length > 0 && (
        <div className="mb-4 border-t pt-4" style={{ borderColor: theme.cardBorder }}>
          <h4 className="text-sm font-medium text-text mb-3 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            Histórico Completo de Aportes
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sortedContributions.map(contribution => (
              <div key={contribution.id} className="rounded-lg p-3" style={{ backgroundColor: theme.cardBorder }}>
                {editingContribution === contribution.id ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        step="0.01"
                        min="0"
                        className="flex-1 px-2 py-1 rounded text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
                      />
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="flex-1 px-2 py-1 rounded text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateContribution}
                        className="flex-1 px-3 py-1 text-white rounded text-sm transition-colors bg-primary hover:bg-secondary"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => {
                          setEditingContribution(null);
                          setEditAmount('');
                          setEditDate('');
                        }}
                        className="flex-1 px-3 py-1 rounded text-sm transition-colors hover:bg-cardBorder"
                        style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-text opacity-90 truncate pr-2">
                          {formatBrazilDate(new Date(contribution.date))}
                        </span>
                        <span className="font-medium text-primary flex-shrink-0">
                          +{formatCurrency(contribution.amount)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      <button
                        onClick={() => handleEditContribution(contribution)}
                        className="p-1 rounded transition-colors text-text hover:text-primary hover:bg-cardBorder"
                        title="Editar aporte"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteContribution(contribution.id)}
                        className="p-1 rounded transition-colors text-text hover:text-accent hover:bg-cardBorder"
                        title="Excluir aporte"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick History Preview (when not showing full history) */}
      {!showHistory && sortedContributions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-text mb-2 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            Últimos Aportes
          </h4>
          <div className="space-y-1">
            {sortedContributions.slice(0, 2).map(contribution => (
              <div key={contribution.id} className="flex justify-between text-xs rounded p-2" style={{ backgroundColor: theme.cardBorder }}>
                <span className="text-text opacity-90 truncate pr-2">
                  {formatBrazilDate(new Date(contribution.date))}
                </span>
                <span className="font-medium text-primary flex-shrink-0">
                  +{formatCurrency(contribution.amount)}
                </span>
              </div>
            ))}
            {sortedContributions.length > 2 && (
              <button
                onClick={() => setShowHistory(true)}
                className="w-full text-xs text-text opacity-70 text-center py-1 rounded transition-colors hover:bg-cardBorder"
              >
                Ver todos os {sortedContributions.length} aportes
              </button>
            )}
          </div>
        </div>
      )}

      {isComplete ? (
        <div className="text-center py-2">
          <span className="text-primary font-medium">🎉 Meta Concluída!</span>
        </div>
      ) : (
        <div className="space-y-3">
          {!showAddAmount ? (
            <button
              onClick={() => setShowAddAmount(true)}
              className="w-full py-2 px-4 rounded-lg transition-colors text-sm font-medium bg-primary/20 text-primary hover:bg-primary/30"
            >
              Adicionar Aporte
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="Valor"
                  step="0.01"
                  min="0"
                  className="flex-1 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
                />
                <button
                  onClick={handleAddAmount}
                  disabled={!addAmount || parseFloat(addAmount) <= 0}
                  className="px-4 py-2 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm flex-shrink-0 bg-primary hover:bg-secondary"
                >
                  +
                </button>
                <button
                  onClick={() => {
                    setShowAddAmount(false);
                    setAddAmount('');
                    setContributionDate(getBrazilDateString());
                  }}
                  className="px-4 py-2 rounded-lg text-sm flex-shrink-0 transition-colors hover:bg-cardBorder"
                  style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
                >
                  ✕
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-text opacity-70 flex-shrink-0" />
                <input
                  type="date"
                  value={contributionDate}
                  onChange={(e) => setContributionDate(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
                />
              </div>
              
              <p className="text-xs text-text opacity-70">
                O valor será deduzido do saldo do mês correspondente à data selecionada
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SavingsGoals;