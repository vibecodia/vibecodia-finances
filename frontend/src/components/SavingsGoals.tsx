import { Target, Plus, Minus, Trash2, Edit3, Calendar, TrendingUp, History, X, ChevronDown, RotateCcw, Check } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useTheme } from '../contexts/ThemeContext';
import { useCurrencyInput } from '../hooks/useCurrencyInput';
import { cn } from '../lib/utils';
import { SavingsGoal, SavingsContribution } from '../types';
import { formatCurrency, formatBrazilDate, getBrazilDateString } from '../utils/helpers';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';

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
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    deadline: '',
  });

  // Use a separate initial value for the hook to prevent stale data
  const [initialTarget, setInitialTarget] = useState(0);
  const { inputProps: targetAmountInputProps, numericValue: targetAmountValue } = useCurrencyInput(
    initialTarget
  );

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [goalToReactivate, setGoalToReactivate] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const activeGoals = (goals || []).filter((g: SavingsGoal) => g.status !== 'deleted');
  const deletedGoals = (goals || []).filter((g: SavingsGoal) => g.status === 'deleted');

  // Filter goals by search term
  const filterBySearch = (list: SavingsGoal[]) => {
    if (!searchTerm) return list;
    return list.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
  };

  const filteredActiveGoals = filterBySearch(activeGoals);
  const filteredDeletedGoals = filterBySearch(deletedGoals);

  // Auto-switch back to active view if no deleted goals remain
  useEffect(() => {
    if (showDeleted && filteredDeletedGoals.length === 0 && deletedGoals.length === 0) {
      setShowDeleted(false);
    }
  }, [deletedGoals.length, filteredDeletedGoals.length, showDeleted]);

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
    
    if (!formData.name || targetAmountValue === 0) {
      return;
    }

    if (editingGoalId) {
      // When editing, only update name, targetAmount, and deadline - preserve contributions
      const updates: Partial<SavingsGoal> = {
        name: formData.name,
        targetAmount: targetAmountValue,
        deadline: formData.deadline || undefined,
      };
      onUpdate(editingGoalId, updates);
      setEditingGoalId(null);
    } else {
      // When creating new, initialize with empty contributions
      const goalData = {
        name: formData.name,
        targetAmount: targetAmountValue,
        currentAmount: 0,
        deadline: formData.deadline || undefined,
        contributions: [],
      };
      onAdd(goalData);
    }

    setFormData({ name: '', deadline: '' });
    setInitialTarget(0);
    setShowForm(false);
  };

  const handleEdit = (goal: SavingsGoal) => {
    const deadline = goal.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : '';
    setEditingGoalId(goal.id);
    setInitialTarget(goal.targetAmount);
    setFormData({
      name: goal.name,
      deadline: deadline,
    });
    setShowForm(true);
  };

  const goalsForDisplay = showDeleted ? filteredDeletedGoals : filteredActiveGoals;
  const totalGoals = activeGoals.reduce((sum: number, goal: SavingsGoal) => sum + (goal.targetAmount || 0), 0);
  const totalSaved = activeGoals.reduce((sum: number, goal: SavingsGoal) => sum + (goal.currentAmount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header - Standardized with TransactionList */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-text mb-1 truncate">
            Metas de Economia
          </h2>
          <p className="text-sm font-medium opacity-70 flex items-center flex-wrap gap-y-1" style={{ color: theme.primary }}>
            <span>Total: {formatCurrency(totalSaved)} / {formatCurrency(totalGoals)}</span>
            {activeGoals.length > 0 && (
              <>
                <span className="mx-2">•</span>
                <span className="text-xs opacity-90">{activeGoals.length} {activeGoals.length === 1 ? 'meta' : 'metas'}</span>
              </>
            )}
            {deletedGoals.length > 0 && (
              <>
                <span className="mx-2">•</span>
                <Button 
                  onClick={() => setShowDeleted(!showDeleted)}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full transition-colors flex items-center gap-1",
                    showDeleted && "bg-accent text-white"
                  )}
                  style={{ backgroundColor: showDeleted ? theme.accent : undefined }}
                >
                  {deletedGoals.length} {deletedGoals.length === 1 ? 'excluída' : 'excluídas'}
                  <span className={`transition-transform ${showDeleted ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-3 h-3" />
                  </span>
                </Button>
              </>
            )}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingGoalId(null);
            setInitialTarget(0);
            setFormData({ name: '', deadline: '' });
            setShowForm(true);
          }}
          size="icon"
          className="flex-shrink-0"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Search Input - Standardized with TransactionList */}
      {(activeGoals.length > 0 || deletedGoals.length > 0) && (
        <div className="relative flex items-center w-full">
          <Input
            type="text"
            placeholder="Buscar metas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search absolute left-3 text-text opacity-70"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
      )}

      {/* Goals List */}
      <div className="space-y-3">
        {goalsForDisplay.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.cardBorder }}>
              <Target className="w-8 h-8 text-text opacity-70" />
            </div>
            <p className="text-text opacity-90 mb-4">
              {showDeleted ? 'Nenhuma meta excluída encontrada' : 'Nenhuma meta cadastrada'}
            </p>
            {!showDeleted && (
              <Button
                onClick={() => setShowForm(true)}
              >
                Criar primeira meta
              </Button>
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

      {/* Form Modal - Standardized with TransactionList */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200" style={{ backgroundColor: theme.cardBackground }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-text truncate pr-2">
                {editingGoalId ? 'Editar Meta' : 'Nova Meta'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingGoalId(null);
                  setFormData({ name: '', deadline: '' });
                }}
                className="p-2 rounded-full transition-colors hover:bg-cardBorder"
              >
                <X className="w-5 h-5 text-text" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Nome da Meta"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Reserva de Emergência"
                required
              />

              <Input
                {...targetAmountInputProps}
                label="Valor Objetivo (R$)"
                placeholder="0,00"
                required
              />

              <Input
                label="Prazo Final (Opcional)"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingGoalId(null);
                    setFormData({ name: '', deadline: '' });
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                >
                  {editingGoalId ? 'Salvar' : 'Criar Meta'}
                </Button>
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
  const [contributionDate, setContributionDate] = useState(getBrazilDateString());
  const [editingContributionId, setEditingContributionId] = useState<string | null>(null);
  const [monthlyYield, setMonthlyYield] = useState(1.0);

  // useCurrencyInput for Add Aporte
  const [initialAddAmount, setInitialAddAmount] = useState(0);
  const { inputProps: addAmountInputProps, numericValue: addAmountValue } = useCurrencyInput(
    initialAddAmount
  );

  // useCurrencyInput for Edit Aporte
  const [initialEditAmount, setInitialEditAmount] = useState(0);
  const { inputProps: editAmountInputProps, numericValue: editAmountValue } = useCurrencyInput(
    initialEditAmount
  );

  const handleAddAmount = () => {
    if (addAmountValue <= 0) return;
    
    onAddContribution(goal.id, addAmountValue, contributionDate);
    setInitialAddAmount(0);
    setContributionDate(getBrazilDateString());
    setShowAddAmount(false);
  };

  const [editDate, setEditDate] = useState('');

  const handleEditContribution = (contribution: SavingsContribution) => {
    setEditingContributionId(contribution.id);
    setInitialEditAmount(contribution.amount);
    const formattedDate = contribution.date ? new Date(contribution.date).toISOString().split('T')[0] : '';
    setEditDate(formattedDate);
  };

  const handleUpdateContribution = () => {
    if (!editingContributionId) return;
    
    if (editAmountValue <= 0) return;
    
    onUpdateContribution(goal.id, editingContributionId, {
      amount: editAmountValue,
      date: editDate,
    });
    
    setEditingContributionId(null);
    setInitialEditAmount(0);
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
    <Card className={cn(`relative no-select ${isGoalDeleted ? 'opacity-50 grayscale cursor-not-allowed' : ''}`)}
      style={{ 
        borderColor: isGoalDeleted ? theme.cardBorder : (isComplete ? theme.primary : theme.cardBorder)
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="border shadow-sm rounded-lg px-3 py-1 min-w-0 flex-1"
              style={{ backgroundColor: theme.primary + '10', borderColor: theme.cardBorder + '80' }}
            >
              <h3 className={cn("font-bold text-base text-text break-words", isGoalDeleted && "line-through")}>
                {goal.name}
              </h3>
            </div>
            {!isGoalDeleted && isComplete && (
              <div className="p-1 rounded-full bg-[#D4EDDA] flex-shrink-0">
                <Check className="w-4 h-4 text-black" />
              </div>
            )}
            {isGoalDeleted && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                Excluída
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-text opacity-90">
            {goal.deadline && (
              <span className="px-2 py-1 rounded-full flex items-center gap-1 whitespace-nowrap" style={{ backgroundColor: theme.cardBorder }}>
                <Calendar className="w-3 h-3 flex-shrink-0" />
                Prazo: {formatBrazilDate(new Date(goal.deadline))}
              </span>
            )}
            {isGoalDeleted && goal.deletedAt && (
              <span className="px-2 py-1 rounded-full text-accent font-medium" style={{ backgroundColor: theme.cardBorder }}>
                Excluída em: {formatBrazilDate(new Date(goal.deletedAt))}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isGoalDeleted ? (
            <Button
              onClick={onReactivate}
              size="sm"
              className="shadow-sm"
              title="Restaurar meta"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          ) : (
            <>
              {sortedContributions.length > 0 && (
                <Button
                  onClick={() => setShowHistory(!showHistory)}
                  variant="ghost"
                  size="sm"
                  title="Ver histórico de aportes"
                >
                  <History className="w-4 h-4" />
                </Button>
              )}
              <Button
                onClick={onEdit}
                variant="ghost"
                size="sm"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button
                onClick={onDelete}
                variant="ghost"
                size="sm"
                className="hover:text-accent"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text opacity-70">Progresso</span>
            <span className="font-bold" style={{ color: theme.text }}>
              {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
            </span>
          </div>
          
          <div className="w-full rounded-full h-2.5 overflow-hidden" style={{ backgroundColor: theme.cardBorder }}>
            <div 
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ 
                backgroundColor: isGoalDeleted ? theme.accent : (isComplete ? theme.primary : theme.accent),
                width: `${Math.min(progress, 100)}%` 
              }}
            />
          </div>
          
          <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
            <span className={isComplete ? 'text-primary' : 'text-accent'}>
              {progress.toFixed(1)}% concluído
            </span>
            {!isComplete && !isGoalDeleted && (
              <span className="text-text opacity-50">
                Faltam {formatCurrency(remainingAmount)}
              </span>
            )}
          </div>
        </div>

        {/* Yield Projection */}
        {goal.currentAmount > 0 && !isGoalDeleted && (
          <div className="bg-primary/5 rounded-xl border border-primary/10 p-3 transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[10px] text-primary font-bold uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Rendimento Estimado</span>
              </div>
              
              <div className="flex items-center gap-2 bg-cardBackground border border-cardBorder rounded-lg px-1 py-0.5 shadow-sm">
                <button 
                  onClick={() => setMonthlyYield(prev => Math.max(0, prev - 0.1))}
                  className="p-1 hover:bg-cardBorder rounded-md transition-colors"
                >
                  <Minus className="w-3 h-3 text-text opacity-70" />
                </button>
                <span className="text-[10px] font-mono font-bold text-text min-w-[2.5rem] text-center">
                  {monthlyYield.toFixed(1)}%
                </span>
                <button 
                  onClick={() => setMonthlyYield(prev => prev + 0.1)}
                  className="p-1 hover:bg-cardBorder rounded-md transition-colors"
                >
                  <Plus className="w-3 h-3 text-text opacity-70" />
                </button>
              </div>
            </div>
            
            <div className="flex justify-between items-center text-xs">
              <span className="text-text opacity-60 italic">Projeção mensal:</span>
              <span className="text-primary font-bold">
                {formatCurrency(goal.currentAmount * (1 + monthlyYield / 100))}
              </span>
            </div>
          </div>
        )}

        {/* Contributions History */}
        {showHistory && sortedContributions.length > 0 && (
          <div className="space-y-3 pt-2 border-t" style={{ borderColor: theme.cardBorder }}>
            <h4 className="text-xs font-bold text-text opacity-60 uppercase tracking-widest flex items-center gap-2">
              <History className="w-3.5 h-3.5" />
              {showDeleted ? 'Aportes Excluídos' : 'Histórico de Aportes'}
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              {sortedContributions.map(contribution => (
                <div key={contribution.id} className="rounded-xl border p-3 transition-all" style={{ backgroundColor: theme.background, borderColor: theme.cardBorder }}>
                  {editingContributionId === contribution.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          {...editAmountInputProps}
                          label="Valor"
                          className="py-1.5"
                        />
                        <Input
                          label="Data"
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="py-1.5"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleUpdateContribution}
                          size="sm"
                          className="flex-1"
                        >
                          Salvar
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingContributionId(null);
                            setInitialEditAmount(0);
                            setEditDate('');
                          }}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("text-sm font-bold text-text", contribution.status === 'deleted' && "line-through opacity-50")}>
                            {formatBrazilDate(new Date(contribution.date))}
                          </span>
                          {!isGoalDeleted && contribution.status !== 'deleted' && contribution.isPaid === false && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFE0B2] text-black">
                              Pendente
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-primary/70 uppercase tracking-widest">
                          Aporte
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={cn("font-bold text-sm text-primary", contribution.status === 'deleted' && "text-accent line-through opacity-50")}>
                          +{formatCurrency(contribution.amount)}
                        </span>
                        
                        {!isGoalDeleted && contribution.status !== 'deleted' && (
                          <div className="flex items-center gap-1">
                            {contribution.isPaid === false && contribution.transactionId && (
                              <Button
                                onClick={() => onUpdatePaymentStatus(contribution.transactionId!, true)}
                                variant="ghost"
                                size="sm"
                                className="p-1.5"
                                title="Marcar como pago"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              onClick={() => handleEditContribution(contribution)}
                              variant="ghost"
                              size="sm"
                              className="p-1.5"
                              title="Editar aporte"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteContribution(contribution.id)}
                              variant="ghost"
                              size="sm"
                              className="p-1.5 hover:text-accent"
                              title="Excluir aporte"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Section */}
        {isGoalDeleted ? (
          <div className="text-center py-2 bg-accent/5 rounded-xl border border-accent/10">
            <span className="text-accent text-xs font-bold uppercase tracking-widest">Meta Excluída</span>
          </div>
        ) : isComplete ? (
          <div className="text-center py-3 bg-primary/10 rounded-xl border border-primary/20 animate-pulse">
            <span className="text-primary text-sm font-bold">🎉 Meta Concluída com Sucesso!</span>
          </div>
        ) : (
          <div className="space-y-3">
            {!showAddAmount ? (
              <Button
                onClick={() => setShowAddAmount(true)}
                className="w-full"
              >
                Adicionar Aporte
              </Button>
            ) : (
              <div className="p-3 rounded-xl border-2 border-dashed space-y-3 animate-in slide-in-from-top-2 duration-200" style={{ borderColor: theme.cardBorder }}>
                <div className="flex gap-2">
                  <Input
                    {...addAmountInputProps}
                    placeholder="Valor"
                    className="py-2"
                  />
                  <Button
                    onClick={handleAddAmount}
                    disabled={addAmountValue <= 0}
                    size="sm"
                    className="h-10 w-10 p-0"
                  >
                    +
                  </Button>
                  <Button
                    onClick={() => {
                      setShowAddAmount(false);
                      setInitialAddAmount(0);
                      setContributionDate(getBrazilDateString());
                    }}
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-primary" />
                  <Input
                    type="date"
                    value={contributionDate}
                    onChange={(e) => setContributionDate(e.target.value)}
                    className="py-1.5"
                  />
                </div>
                
                <p className="text-[10px] text-text opacity-50 font-medium italic">
                  * O aporte será deduzido do saldo do mês selecionado.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default SavingsGoals;
