import { Target, Plus, Minus, Trash2, Edit3, Calendar, TrendingUp, History, X, ChevronDown, RotateCcw, Check } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useTheme } from '../contexts/ThemeContext';
import { useCurrencyInput } from '../hooks/useCurrencyInput';
import { cn } from '../lib/utils';
import { SavingsGoal, SavingsContribution } from '../types';
import { formatCurrency, formatBrazilDate, getBrazilDateString } from '../utils/helpers';

import ConfirmationModal from './ConfirmationModal';


interface SavingsGoalsProps {
  goals: SavingsGoal[];
  onAdd: (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<SavingsGoal>) => void;
  onDelete: (id: string) => void;
  onAddContribution: (goalId: string, amount: number, date?: string) => void;
  onUpdateContribution: (goalId: string, contributionId: string, updates: Partial<SavingsContribution>) => void;
  onDeleteContribution: (goalId: string, contributionId: string) => void;
  onUpdatePaymentStatus: (transactionId: string, isPaid: boolean) => void;
}

const SavingsGoals: React.FC<SavingsGoalsProps> = ({ 
  goals, 
  onAdd, 
  onUpdate, 
  onDelete, 
  onAddContribution,
  onUpdateContribution,
  onDeleteContribution,
  onUpdatePaymentStatus
}) => {
  const { theme } = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    deadline: '',
  });

  const { inputProps: targetAmountInputProps, numericValue: targetAmountValue } = useCurrencyInput(
    parseFloat(formData.targetAmount || '0')
  );

  useEffect(() => {
    const stringAmount = targetAmountValue === 0 ? '' : targetAmountValue.toString();
    if (stringAmount !== formData.targetAmount) {
      setFormData(prev => ({ ...prev, targetAmount: stringAmount }));
    }
  }, [targetAmountValue, formData.targetAmount]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [goalToReactivate, setGoalToReactivate] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const activeGoals = (goals || []).filter(g => g.status !== 'deleted');
  const deletedGoals = (goals || []).filter(g => g.status === 'deleted');

  // Auto-switch back to active view if no deleted goals remain
  useEffect(() => {
    if (showDeleted && deletedGoals.length === 0) {
      setShowDeleted(false);
    }
  }, [deletedGoals.length, showDeleted]);

  const openDeleteModal = (id: string) => {
    setGoalToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setGoalToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const openReactivateModal = (id: string) => {
    setGoalToReactivate(id);
    setIsReactivateModalOpen(true);
  };

  const closeReactivateModal = () => {
    setGoalToReactivate(null);
    setIsReactivateModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (goalToDelete) {
      onDelete(goalToDelete);
    }
    closeDeleteModal();
  };

  const handleReactivateConfirm = () => {
    if (goalToReactivate) {
      onUpdate(goalToReactivate, { status: 'active' });
    }
    closeReactivateModal();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.targetAmount) {
      return;
    }

    if (editingGoal) {
      // When editing, only update name, targetAmount, and deadline - preserve contributions
      const updates: Partial<SavingsGoal> = {
        name: formData.name,
        targetAmount: parseFloat(formData.targetAmount),
        deadline: formData.deadline || undefined,
      };
      onUpdate(editingGoal, updates);
      setEditingGoal(null);
    } else {
      // When creating new, initialize with empty contributions
      const goalData = {
        name: formData.name,
        targetAmount: parseFloat(formData.targetAmount),
        currentAmount: 0,
        deadline: formData.deadline || undefined,
        contributions: [],
      };
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

  const goalsForDisplay = showDeleted ? deletedGoals : activeGoals;
  const totalGoals = activeGoals.reduce((sum, goal) => sum + (goal.targetAmount || 0), 0);
  const totalSaved = activeGoals.reduce((sum, goal) => sum + (goal.currentAmount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-text mb-1 truncate">
            Metas de Economia
          </h2>
          <div className="flex items-center flex-wrap gap-2 text-sm text-text opacity-90 truncate">
            {activeGoals.length > 0 && (
              <p>
                Total: <span className="font-medium">{formatCurrency(totalSaved)} / {formatCurrency(totalGoals)}</span>
              </p>
            )}
            
            {deletedGoals.length > 0 && (
              <>
                <span className="opacity-50">•</span>
                <button 
                  onClick={() => setShowDeleted(!showDeleted)}
                  className={`text-xs font-bold px-2 py-0.5 rounded-full transition-colors flex items-center gap-1 ${
                    showDeleted 
                      ? 'bg-accent text-white' 
                      : 'opacity-90 hover:underline'
                  }`}
                  style={{ backgroundColor: showDeleted ? theme.accent : undefined }}
                >
                  {deletedGoals.length} {deletedGoals.length === 1 ? 'excluída' : 'excluídas'}
                  <span className={`transition-transform ${showDeleted ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-3 h-3" />
                  </span>
                </button>
              </>
            )}
          </div>
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
        {goalsForDisplay.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.cardBorder }}>
              <Target className="w-8 h-8 text-text opacity-70" />
            </div>
            <p className="text-text opacity-90 mb-4">
              {showDeleted ? 'Nenhuma meta excluída encontrada' : 'Nenhuma meta cadastrada'}
            </p>
            {!showDeleted && (
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 text-white rounded-xl font-medium transition-colors bg-primary hover:bg-secondary"
              >
                Criar primeira meta
              </button>
            )}
          </div>
        ) : (
          goalsForDisplay.map((goal) => {
            const currentAmount = goal.currentAmount || 0;
            const targetAmount = goal.targetAmount || 0;
            const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
            const isComplete = progress >= 100;
            
            return (
              <GoalCard 
                key={goal.id}
                goal={goal}
                progress={progress}
                isComplete={isComplete}
                onEdit={() => handleEdit(goal)}
                onDelete={() => openDeleteModal(goal.id)}
                onReactivate={() => openReactivateModal(goal.id)}
                onAddContribution={onAddContribution}
                onUpdateContribution={onUpdateContribution}
                onDeleteContribution={onDeleteContribution}
                onUpdatePaymentStatus={onUpdatePaymentStatus}
                showDeleted={showDeleted}
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
                  {...targetAmountInputProps}
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
        message="Tem certeza de que deseja excluir esta meta de economia? Todos os aportes associados também serão marcados como excluídos."
      />

      <ConfirmationModal
        isOpen={isReactivateModalOpen}
        onClose={closeReactivateModal}
        onConfirm={handleReactivateConfirm}
        title="Restaurar Meta"
        message="Deseja restaurar esta meta e todos os seus aportes?"
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
  onReactivate: () => void;
  onAddContribution: (goalId: string, amount: number, date?: string) => void;
  onUpdateContribution: (goalId: string, contributionId: string, updates: Partial<SavingsContribution>) => void;
  onDeleteContribution: (goalId: string, contributionId: string) => void;
  onUpdatePaymentStatus: (transactionId: string, isPaid: boolean) => void;
  showDeleted?: boolean;
}

const GoalCard: React.FC<GoalCardProps> = ({ 
  goal, 
  progress, 
  isComplete, 
  onEdit, 
  onDelete, 
  onReactivate,
  onAddContribution,
  onUpdateContribution,
  onDeleteContribution,
  onUpdatePaymentStatus,
  showDeleted = false
}) => {
  const { theme } = useTheme();
  const [showAddAmount, setShowAddAmount] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [contributionDate, setContributionDate] = useState(getBrazilDateString());
  const [editingContribution, setEditingContribution] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [monthlyYield, setMonthlyYield] = useState(1.0);

  const { inputProps: addAmountInputProps, numericValue: addAmountValue } = useCurrencyInput(
    parseFloat(addAmount || '0')
  );

  const { inputProps: editAmountInputProps, numericValue: editAmountValue } = useCurrencyInput(
    parseFloat(editAmount || '0')
  );

  useEffect(() => {
    const stringAmount = addAmountValue === 0 ? '' : addAmountValue.toString();
    if (stringAmount !== addAmount) {
      setAddAmount(stringAmount);
    }
  }, [addAmountValue, addAmount]);

  useEffect(() => {
    const stringAmount = editAmountValue === 0 ? '' : editAmountValue.toString();
    if (stringAmount !== editAmount) {
      setEditAmount(stringAmount);
    }
  }, [editAmountValue, editAmount]);

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

  // Sort contributions by date (most recent first) and filter based on showDeleted
  const sortedContributions = (goal.contributions || [])
    .filter(c => showDeleted ? c.status === 'deleted' : c.status !== 'deleted')
    .sort((a, b) => {
      try {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } catch {
        return 0;
      }
    });

  const isGoalDeleted = goal.status === 'deleted';

  return (
    <div className={cn(`border rounded-2xl p-6 transition-all ${isGoalDeleted ? 'opacity-60 grayscale-[0.5]' : ''}`)}
      style={{ 
        backgroundColor: theme.cardBackground,
        borderColor: isGoalDeleted ? theme.accent : (isComplete ? theme.primary : theme.cardBorder),
        boxShadow: isComplete ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' // Default shadow
      }}
    >
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="flex-1 min-w-0">
          <h3 className={cn("font-semibold text-text mb-1 truncate", isGoalDeleted && "line-through")}>
            {goal.name}
          </h3>
          {goal.deadline && (
            <p className="text-sm text-text opacity-90 truncate">
              Prazo: {formatBrazilDate(new Date(goal.deadline))}
            </p>
          )}
          {isGoalDeleted && goal.deletedAt && (
            <p className="text-xs text-accent font-medium mt-1">
              Excluída em: {formatBrazilDate(new Date(goal.deletedAt))}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isGoalDeleted && (
            <button
              onClick={onReactivate}
              className="p-2 rounded-lg transition-colors text-accent hover:text-primary hover:bg-cardBorder"
              title="Restaurar meta"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          {!isGoalDeleted && (
            <>
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
            </>
          )}
        </div>
      </div>
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-text opacity-90 truncate pr-2">Progresso</span>
          <span className="font-medium flex-shrink-0" style={{ color: theme.text }}>
            {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
          </span>
        </div>
        
        {goal.currentAmount > 0 && (
          <div className="mb-4 bg-green-50/20 dark:bg-green-900/10 p-2.5 rounded-xl border border-green-100/50 dark:border-green-900/20 transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wider">
                <TrendingUp className="w-3 h-3" />
                <span>Lucro Estimado</span>
              </div>
              
              <div className="flex items-center gap-2 bg-cardBackground border border-cardBorder rounded-lg px-1 py-0.5 shadow-sm">
                <button 
                  onClick={() => setMonthlyYield(prev => Math.max(0, prev - 0.1))}
                  className="p-1 hover:bg-cardBorder rounded-md transition-colors"
                >
                  <Minus className="w-2.5 h-2.5 text-text opacity-70" />
                </button>
                <span className="text-[10px] font-mono font-bold text-text min-w-[2.5rem] text-center">
                  {monthlyYield.toFixed(1)}%
                </span>
                <button 
                  onClick={() => setMonthlyYield(prev => prev + 0.1)}
                  className="p-1 hover:bg-cardBorder rounded-md transition-colors"
                >
                  <Plus className="w-2.5 h-2.5 text-text opacity-70" />
                </button>
              </div>
            </div>
            
            <div className="flex justify-between items-center text-xs">
              <span className="text-text opacity-60">Projeção mensal:</span>
              <span className="text-green-600 dark:text-green-400 font-bold">
                {formatCurrency(goal.currentAmount * (1 + monthlyYield / 100))}
              </span>
            </div>
            <div className="text-[9px] text-text opacity-40 text-right mt-0.5 font-mono italic">
              est. {((Math.pow(1 + monthlyYield/100, 12) - 1) * 100).toFixed(1)}% a.a.
            </div>
          </div>
        )}

        <div className="w-full rounded-full h-3" style={{ backgroundColor: theme.cardBorder }}>
          <div 
            className={`h-3 rounded-full transition-all duration-500`}
            style={{ 
              backgroundColor: isGoalDeleted ? theme.accent : (isComplete ? theme.primary : theme.accent),
              width: `${Math.min(progress, 100)}%` 
            }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className={`font-medium ${isComplete ? 'text-primary' : 'text-accent'}`}>
            {progress.toFixed(1)}%
          </span>
          {!isComplete && !isGoalDeleted && (
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
            {showDeleted ? 'Histórico de Aportes Excluídos' : 'Histórico Completo de Aportes'}
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sortedContributions.map(contribution => (
              <div key={contribution.id} className="rounded-lg p-3" style={{ backgroundColor: theme.cardBorder }}>
                {editingContribution === contribution.id ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        {...editAmountInputProps}
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
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className={cn("text-sm text-text opacity-90 truncate", contribution.status === 'deleted' && "line-through opacity-60")}>
                            {formatBrazilDate(new Date(contribution.date))}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-primary/70 uppercase tracking-wider">Aporte</span>
                            {contribution.isPaid === false && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFE0B2] text-black">
                                pending
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={cn("font-medium text-primary flex-shrink-0", contribution.status === 'deleted' && "text-accent line-through opacity-60")}>
                          +{formatCurrency(contribution.amount)}
                        </span>
                      </div>
                      {contribution.status === 'deleted' && contribution.deletedAt && (
                        <p className="text-[10px] text-accent opacity-80">
                          Excluído em {formatBrazilDate(new Date(contribution.deletedAt))}
                        </p>
                      )}
                    </div>
                    {!isGoalDeleted && contribution.status !== 'deleted' && (
                      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        {contribution.isPaid === false && contribution.transactionId && (
                          <button
                            onClick={() => onUpdatePaymentStatus(contribution.transactionId!, true)}
                            className="p-1 rounded transition-colors text-text hover:text-primary hover:bg-cardBorder"
                            title="Marcar como pago"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
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
                    )}
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
            {showDeleted ? 'Últimos Aportes Excluídos' : 'Últimos Aportes'}
          </h4>
          <div className="space-y-1">
            {sortedContributions.slice(0, 2).map(contribution => (
              <div key={contribution.id} className="flex justify-between items-center text-xs rounded p-2" style={{ backgroundColor: theme.cardBorder }}>
                <div className="flex flex-col min-w-0 pr-2">
                  <span className={cn("text-text opacity-90 truncate", contribution.status === 'deleted' && "line-through opacity-60")}>
                    {formatBrazilDate(new Date(contribution.date))}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-primary/70 uppercase tracking-wider">Aporte</span>
                    {contribution.isPaid === false && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFE0B2] text-black">
                        pending
                      </span>
                    )}
                  </div>
                </div>
                <span className={cn("font-medium text-primary flex-shrink-0", contribution.status === 'deleted' && "text-accent line-through opacity-60")}>
                  +{formatCurrency(contribution.amount)}
                </span>
              </div>
            ))}
            {sortedContributions.length > 2 && (
              <button
                onClick={() => setShowHistory(true)}
                className="w-full text-xs text-text opacity-70 text-center py-1 rounded transition-colors hover:bg-cardBorder"
              >
                Ver todos os {sortedContributions.length} aportes {showDeleted ? 'excluídos' : ''}
              </button>
            )}
          </div>
        </div>
      )}

      {isGoalDeleted ? (
        <div className="text-center py-2">
          <span className="text-accent font-medium">Meta Excluída</span>
        </div>
      ) : isComplete ? (
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
                  {...addAmountInputProps}
                  placeholder="Valor"
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
