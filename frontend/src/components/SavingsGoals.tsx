import {
  Target,
  Plus,
  Minus,
  Trash2,
  Edit3,
  Calendar,
  TrendingUp,
  History,
  X,
  ChevronDown,
  RotateCcw,
  Check,
  Archive,
  ArchiveRestore,
  AlertTriangle,
} from "lucide-react";
import React, { useState, useEffect } from "react";

import { useTheme } from "../contexts/ThemeContext";
import { useCurrencyInput } from "../hooks/useCurrencyInput";
import { cn } from "../lib/utils";
import { SavingsGoal, SavingsContribution } from "../types";
import {
  formatCurrency,
  formatBrazilDate,
  getBrazilDateString,
} from "../utils/helpers";

import ConfirmationModal from "./ConfirmationModal";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";

interface SavingsGoalsProps {
  goals: SavingsGoal[];
  onAdd: (goal: Omit<SavingsGoal, "id" | "createdAt" | "updatedAt">) => void;
  onUpdate: (id: string, updates: Partial<SavingsGoal>) => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onDelete: (id: string) => void;
  onAddContribution: (
    goalId: string,
    amount: number,
    date?: string,
    type?: "deposit" | "withdrawal",
    notes?: string,
  ) => void;
  onUpdateContribution: (
    goalId: string,
    contributionId: string,
    updates: Partial<SavingsContribution>,
  ) => void;
  onDeleteContribution: (goalId: string, contributionId: string) => void;
  onRestoreContribution?: (goalId: string, contributionId: string) => void;
  onUpdatePaymentStatus: (transactionId: string, isPaid: boolean) => void;
}

const SavingsGoals: React.FC<SavingsGoalsProps> = ({
  goals,
  onAdd,
  onUpdate,
  onArchive,
  onUnarchive,
  onDelete,
  onAddContribution,
  onUpdateContribution,
  onDeleteContribution,
  onRestoreContribution,
  onUpdatePaymentStatus,
}) => {
  const { theme } = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    deadline: "",
  });

  // Use a separate initial value for the hook to prevent stale data
  const [initialTarget, setInitialTarget] = useState(0);
  const {
    inputProps: targetAmountInputProps,
    numericValue: targetAmountValue,
  } = useCurrencyInput(initialTarget);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [goalToReactivate, setGoalToReactivate] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<"active" | "archived" | "deleted">(
    "active",
  );
  const [searchTerm, setSearchTerm] = useState("");

  const activeGoals = (goals || []).filter(
    (g: SavingsGoal) =>
      g.status === "active" ||
      (!g.status && g.status !== "deleted" && g.status !== "archived"),
  );
  const archivedGoals = (goals || []).filter(
    (g: SavingsGoal) => g.status === "archived",
  );
  const deletedGoals = (goals || []).filter(
    (g: SavingsGoal) => g.status === "deleted",
  );

  // Filter goals by search term
  const filterBySearch = (list: SavingsGoal[]) => {
    if (!searchTerm) return list;
    return list.filter((g) =>
      g.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  };

  const filteredActiveGoals = filterBySearch(activeGoals);
  const filteredArchivedGoals = filterBySearch(archivedGoals);
  const filteredDeletedGoals = filterBySearch(deletedGoals);

  // Auto-switch back to active view if no goals remain in the current filter
  useEffect(() => {
    if (
      viewFilter === "deleted" &&
      filteredDeletedGoals.length === 0 &&
      deletedGoals.length === 0
    ) {
      setViewFilter("active");
    }
    if (
      viewFilter === "archived" &&
      filteredArchivedGoals.length === 0 &&
      archivedGoals.length === 0
    ) {
      setViewFilter("active");
    }
  }, [
    deletedGoals.length,
    filteredDeletedGoals.length,
    archivedGoals.length,
    filteredArchivedGoals.length,
    viewFilter,
  ]);

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
      onUpdate(goalToReactivate, { status: "active" });
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

    setFormData({ name: "", deadline: "" });
    setInitialTarget(0);
    setShowForm(false);
  };

  const handleEdit = (goal: SavingsGoal) => {
    const deadline = goal.deadline
      ? new Date(goal.deadline).toISOString().split("T")[0]
      : "";
    setEditingGoalId(goal.id);
    setInitialTarget(goal.targetAmount);
    setFormData({
      name: goal.name,
      deadline: deadline,
    });
    setShowForm(true);
  };

  const goalsForDisplay =
    viewFilter === "archived"
      ? filteredArchivedGoals
      : viewFilter === "deleted"
        ? filteredDeletedGoals
        : filteredActiveGoals;
  const totalGoals = activeGoals.reduce(
    (sum: number, goal: SavingsGoal) => sum + (goal.targetAmount || 0),
    0,
  );
  const totalSaved = activeGoals.reduce(
    (sum: number, goal: SavingsGoal) => sum + (goal.currentAmount || 0),
    0,
  );

  return (
    <div className="space-y-4">
      {/* Header - Standardized with TransactionList */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-foreground mb-1 truncate">
            Metas de Economia
          </h2>
          <p
            className="text-sm font-medium opacity-70 flex items-center flex-wrap gap-y-1"
            style={{ color: theme.primary }}
          >
            <span>
              Total: {formatCurrency(totalSaved)} / {formatCurrency(totalGoals)}
            </span>
            {activeGoals.length > 0 && (
              <>
                <span className="mx-2">•</span>
                <span className="text-xs opacity-90">
                  {activeGoals.length}{" "}
                  {activeGoals.length === 1 ? "meta" : "metas"}
                </span>
              </>
            )}
            {archivedGoals.length > 0 && (
              <>
                <span className="mx-2">•</span>
                <Button
                  onClick={() =>
                    setViewFilter(
                      viewFilter === "archived" ? "active" : "archived",
                    )
                  }
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full transition-colors flex items-center gap-1",
                    viewFilter === "archived"
                      ? "bg-primary text-primary-foreground"
                      : "opacity-80 hover:opacity-100",
                  )}
                  style={{
                    backgroundColor:
                      viewFilter === "archived" ? theme.primary : undefined,
                    color: viewFilter === "archived" ? "#fff" : undefined,
                  }}
                >
                  <Archive className="w-3 h-3" />
                  {archivedGoals.length}{" "}
                  {archivedGoals.length === 1 ? "arquivada" : "arquivadas"}
                </Button>
              </>
            )}
            {deletedGoals.length > 0 && (
              <>
                <span className="mx-2">•</span>
                <Button
                  onClick={() =>
                    setViewFilter(
                      viewFilter === "deleted" ? "active" : "deleted",
                    )
                  }
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full transition-colors flex items-center gap-1",
                    viewFilter === "deleted" && "bg-accent text-white",
                  )}
                  style={{
                    backgroundColor:
                      viewFilter === "deleted" ? theme.accent : undefined,
                  }}
                >
                  {deletedGoals.length}{" "}
                  {deletedGoals.length === 1 ? "excluída" : "excluídas"}
                  <span
                    className={`transition-transform ${viewFilter === "deleted" ? "rotate-180" : ""}`}
                  >
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
            setFormData({ name: "", deadline: "" });
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-search absolute left-3 text-muted-foreground"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
      )}

      {/* Goals List */}
      <div className="space-y-3">
        {goalsForDisplay.length === 0 ? (
          <div className="text-center py-12">
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: theme.cardBorder }}
            >
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">
              {viewFilter === "archived"
                ? "Nenhuma meta arquivada encontrada"
                : viewFilter === "deleted"
                  ? "Nenhuma meta excluída encontrada"
                  : "Nenhuma meta de economia cadastrada"}
            </p>
            {viewFilter === "active" && (
              <Button onClick={() => setShowForm(true)}>
                Criar primeira meta
              </Button>
            )}
          </div>
        ) : (
          goalsForDisplay.map((goal) => {
            const currentAmount = goal.currentAmount || 0;
            const targetAmount = goal.targetAmount || 0;
            const progress =
              targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
            const isComplete = progress >= 100;

            return (
              <GoalCard
                key={goal.id}
                goal={goal}
                progress={progress}
                isComplete={isComplete}
                onEdit={() => handleEdit(goal)}
                onArchive={() => {
                  if (onArchive) onArchive(goal.id);
                  else onUpdate(goal.id, { status: "archived" });
                }}
                onUnarchive={() => {
                  if (onUnarchive) onUnarchive(goal.id);
                  else onUpdate(goal.id, { status: "active" });
                }}
                onDelete={() => openDeleteModal(goal.id)}
                onReactivate={() => openReactivateModal(goal.id)}
                onAddContribution={onAddContribution}
                onUpdateContribution={onUpdateContribution}
                onDeleteContribution={onDeleteContribution}
                onRestoreContribution={onRestoreContribution}
                onUpdatePaymentStatus={onUpdatePaymentStatus}
                showDeleted={viewFilter === "deleted"}
              />
            );
          })
        )}
      </div>

      {/* Form Modal - Standardized with TransactionList */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className="rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200"
            style={{ backgroundColor: theme.cardBackground }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground truncate pr-2">
                {editingGoalId ? "Editar Meta" : "Nova Meta"}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingGoalId(null);
                  setFormData({ name: "", deadline: "" });
                }}
                className="p-2 rounded-full transition-colors hover:bg-muted"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Nome da Meta"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
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
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, deadline: e.target.value }))
                }
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingGoalId(null);
                    setFormData({ name: "", deadline: "" });
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  {editingGoalId ? "Salvar" : "Criar Meta"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Inteligente de Exclusão / Arquivamento */}
      {isDeleteModalOpen &&
      goals.find((g) => g.id === goalToDelete)?.contributions?.some(
        (c) => c.status !== "deleted",
      ) ? (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 p-0 overflow-hidden">
            <div className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 flex-shrink-0">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="space-y-3 flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-black text-foreground">
                    Meta com Histórico Financeiro
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    A meta{" "}
                    <strong>
                      {goals.find((g) => g.id === goalToDelete)?.name}
                    </strong>{" "}
                    possui movimentações financeiras registradas em meses anteriores.
                  </p>
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5 text-foreground">
                    <p className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      ⚠️ Atenção aos saldos dos meses anteriores:
                    </p>
                    <p className="opacity-90 leading-relaxed">
                      Se você <strong>Excluir Definitivamente</strong>, todas as
                      transações passadas desta meta serão apagadas, o que{" "}
                      <strong>alterará os saldos congelados</strong> dos meses em
                      que o dinheiro esteve guardado.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>Recomendação:</strong> Escolha{" "}
                    <strong>Arquivar Meta</strong> para ocultá-la da tela
                    inicial mantendo seus saldos passados 100% protegidos e
                    intactos.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 sm:px-8 sm:py-5 flex flex-col sm:flex-row gap-3 bg-muted/50 border-t border-border">
              <Button
                variant="primary"
                onClick={() => {
                  if (goalToDelete) {
                    if (onArchive) onArchive(goalToDelete);
                    else onUpdate(goalToDelete, { status: "archived" });
                  }
                  closeDeleteModal();
                }}
                className="flex-1 flex items-center justify-center gap-2 font-bold"
              >
                <Archive className="w-4 h-4" />
                Arquivar (Recomendado)
              </Button>
              <Button
                variant="outline"
                onClick={handleDeleteConfirm}
                className="text-xs text-accent hover:text-accent hover:bg-accent/10 border-border"
              >
                Excluir e Apagar Histórico
              </Button>
              <Button
                variant="ghost"
                onClick={closeDeleteModal}
                className="text-xs"
              >
                Cancelar
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteConfirm}
          title="Confirmar Exclusão"
          message="Tem certeza de que deseja excluir esta meta de economia?"
        />
      )}

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
  onArchive?: () => void;
  onUnarchive?: () => void;
  onDelete: () => void;
  onReactivate: () => void;
  onAddContribution: (
    goalId: string,
    amount: number,
    date?: string,
    type?: "deposit" | "withdrawal",
    notes?: string,
  ) => void;
  onUpdateContribution: (
    goalId: string,
    contributionId: string,
    updates: Partial<SavingsContribution>,
  ) => void;
  onDeleteContribution: (goalId: string, contributionId: string) => void;
  onRestoreContribution?: (goalId: string, contributionId: string) => void;
  onUpdatePaymentStatus: (transactionId: string, isPaid: boolean) => void;
  showDeleted?: boolean;
}

const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  progress,
  isComplete,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
  onReactivate,
  onAddContribution,
  onUpdateContribution,
  onDeleteContribution,
  onRestoreContribution,
  onUpdatePaymentStatus,
  showDeleted = false,
}) => {
  const { theme } = useTheme();
  const [movementMode, setMovementMode] = useState<"deposit" | "withdrawal" | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [movementDate, setMovementDate] = useState(getBrazilDateString());
  const [editingContributionId, setEditingContributionId] = useState<string | null>(null);
  const [monthlyYield, setMonthlyYield] = useState(1.0);

  // useCurrencyInput for Add Movement (Aporte ou Resgate)
  const [initialMovementAmount, setInitialMovementAmount] = useState(0);
  const {
    inputProps: movementAmountInputProps,
    numericValue: movementAmountValue,
  } = useCurrencyInput(initialMovementAmount);

  // useCurrencyInput for Edit Movement
  const [initialEditAmount, setInitialEditAmount] = useState(0);
  const { inputProps: editAmountInputProps, numericValue: editAmountValue } =
    useCurrencyInput(initialEditAmount);

  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);

  const handleSaveMovement = () => {
    if (movementAmountValue <= 0 || !movementMode) return;

    if (movementMode === "withdrawal" && movementAmountValue > goal.currentAmount) {
      return;
    }
    if (movementMode === "deposit" && movementAmountValue > remainingAmount + 0.01) {
      return;
    }

    onAddContribution(goal.id, movementAmountValue, movementDate, movementMode);
    setInitialMovementAmount(0);
    setMovementDate(getBrazilDateString());
    setMovementMode(null);
  };

  const [editDate, setEditDate] = useState("");

  const handleEditContribution = (contribution: SavingsContribution) => {
    setEditingContributionId(contribution.id);
    setInitialEditAmount(contribution.amount);
    const formattedDate = contribution.date
      ? new Date(contribution.date).toISOString().split("T")[0]
      : "";
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
    setEditDate("");
  };

  const [contributionToDelete, setContributionToDelete] =
    useState<SavingsContribution | null>(null);

  const handleDeleteContribution = (contribution: SavingsContribution) => {
    setContributionToDelete(contribution);
  };

  const handleConfirmDeleteContribution = () => {
    if (contributionToDelete) {
      onDeleteContribution(goal.id, contributionToDelete.id);
      setContributionToDelete(null);
    }
  };

  const [showDeletedLocal, setShowDeletedLocal] = useState(false);
  const shouldShowDeleted = showDeleted || showDeletedLocal;
  const deletedCount = (goal.contributions || []).filter(
    (c) => c.status === "deleted",
  ).length;
  const hasDeletedMovements = deletedCount > 0;

  // Sort contributions by date (most recent first) and filter based on showDeleted
  const sortedContributions = (goal.contributions || [])
    .filter((c) =>
      shouldShowDeleted ? c.status === "deleted" : c.status !== "deleted",
    )
    .sort((a, b) => {
      try {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } catch {
        return 0;
      }
    });

  const isGoalDeleted = goal.status === "deleted";
  const isGoalArchived = goal.status === "archived";

  return (
    <Card
      className={cn(
        `relative no-select ${isGoalDeleted ? "opacity-50 grayscale cursor-not-allowed" : ""}`,
      )}
      style={{
        borderColor: isGoalDeleted
          ? theme.cardBorder
          : isGoalArchived
            ? theme.cardBorder
            : isComplete
              ? theme.primary
              : theme.cardBorder,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="border shadow-sm rounded-lg px-3 py-1 min-w-0 flex-1"
              style={{
                backgroundColor: theme.primary + "10",
                borderColor: theme.cardBorder + "80",
              }}
            >
              <h3
                className={cn(
                  "font-bold text-base text-foreground break-words",
                  isGoalDeleted && "line-through",
                )}
              >
                {goal.name}
              </h3>
            </div>
            {!isGoalDeleted && !isGoalArchived && isComplete && (
              <div className="p-1 rounded-full bg-[#D4EDDA] flex-shrink-0">
                <Check className="w-4 h-4 text-black" />
              </div>
            )}
            {isGoalDeleted && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                Excluída
              </span>
            )}
            {isGoalArchived && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Archive className="w-3 h-3" />
                Arquivada
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {goal.deadline && (
              <span
                className="px-2 py-1 rounded-full flex items-center gap-1 whitespace-nowrap"
                style={{ backgroundColor: theme.cardBorder }}
              >
                <Calendar className="w-3 h-3 flex-shrink-0" />
                Prazo: {formatBrazilDate(new Date(goal.deadline))}
              </span>
            )}
            {isGoalArchived && goal.archivedAt && (
              <span
                className="px-2 py-1 rounded-full text-primary font-medium"
                style={{ backgroundColor: theme.cardBorder }}
              >
                Arquivada em: {formatBrazilDate(new Date(goal.archivedAt))}
              </span>
            )}
            {isGoalDeleted && goal.deletedAt && (
              <span
                className="px-2 py-1 rounded-full text-accent font-medium"
                style={{ backgroundColor: theme.cardBorder }}
              >
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
          ) : isGoalArchived ? (
            <div className="flex items-center gap-1.5">
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
              {onUnarchive && (
                <Button
                  onClick={onUnarchive}
                  size="sm"
                  variant="outline"
                  className="text-xs flex items-center gap-1 shadow-sm font-semibold"
                  title="Desarquivar meta (voltar para ativas)"
                >
                  <ArchiveRestore className="w-3.5 h-3.5" />
                  <span>Desarquivar</span>
                </Button>
              )}
              <Button
                onClick={onDelete}
                variant="ghost"
                size="sm"
                className="hover:text-accent"
                title="Excluir meta"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
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
              {onArchive && (
                <Button
                  onClick={onArchive}
                  variant="ghost"
                  size="sm"
                  title="Arquivar meta (preserva histórico de saldos congelados)"
                >
                  <Archive className="w-4 h-4" />
                </Button>
              )}
              <Button
                onClick={onEdit}
                variant="ghost"
                size="sm"
                title="Editar meta"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button
                onClick={onDelete}
                variant="ghost"
                size="sm"
                className="hover:text-accent"
                title="Excluir meta"
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
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-bold" style={{ color: theme.text }}>
              {formatCurrency(goal.currentAmount)} /{" "}
              {formatCurrency(goal.targetAmount)}
            </span>
          </div>

          <div
            className="w-full rounded-full h-2.5 overflow-hidden"
            style={{ backgroundColor: theme.cardBorder }}
          >
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                backgroundColor: isGoalDeleted
                  ? theme.accent
                  : isComplete
                    ? theme.primary
                    : theme.accent,
                width: `${Math.min(progress, 100)}%`,
              }}
            />
          </div>

          <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
            <span className={isComplete ? "text-primary" : "text-accent"}>
              {progress.toFixed(1)}% concluído
            </span>
            {!isComplete && !isGoalDeleted && (
              <span className="text-muted-foreground">
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

              <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-1 py-0.5 shadow-sm">
                <button
                  onClick={() =>
                    setMonthlyYield((prev) => Math.max(0, prev - 0.1))
                  }
                  className="p-1 hover:bg-muted rounded-md transition-colors"
                >
                  <Minus className="w-3 h-3 text-muted-foreground" />
                </button>
                <span className="text-[10px] font-mono font-bold text-foreground min-w-[2.5rem] text-center">
                  {monthlyYield.toFixed(1)}%
                </span>
                <button
                  onClick={() => setMonthlyYield((prev) => prev + 0.1)}
                  className="p-1 hover:bg-muted rounded-md transition-colors"
                >
                  <Plus className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground italic">
                Projeção mensal:
              </span>
              <span className="text-primary font-bold">
                {formatCurrency(goal.currentAmount * (1 + monthlyYield / 100))}
              </span>
            </div>
          </div>
        )}

        {/* Contributions History */}
        {showHistory && sortedContributions.length > 0 && (
          <div
            className="space-y-3 pt-2 border-t"
            style={{ borderColor: theme.cardBorder }}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <History className="w-3.5 h-3.5" />
                {shouldShowDeleted
                  ? "Movimentações Revertidas / Excluídas"
                  : "Histórico de Movimentações"}
              </h4>
              {hasDeletedMovements && !showDeleted && (
                <Button
                  onClick={() => setShowDeletedLocal(!showDeletedLocal)}
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] uppercase font-bold text-muted-foreground hover:text-primary px-2"
                >
                  {showDeletedLocal
                    ? "Ver ativas"
                    : `Ver revertidas (${deletedCount})`}
                </Button>
              )}
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              {sortedContributions.map((contribution) => (
                <div
                  key={contribution.id}
                  className="rounded-xl border p-3 transition-all"
                  style={{
                    backgroundColor: theme.background,
                    borderColor: theme.cardBorder,
                  }}
                >
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
                            setEditDate("");
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
                          <span
                            className={cn(
                              "text-sm font-bold text-foreground",
                              contribution.status === "deleted" &&
                                "line-through opacity-50",
                            )}
                          >
                            {formatBrazilDate(new Date(contribution.date))}
                          </span>
                          {!isGoalDeleted &&
                            contribution.status !== "deleted" &&
                            contribution.isPaid === false && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFE0B2] text-black">
                                Pendente
                              </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded",
                              contribution.type === "withdrawal"
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : "bg-primary/15 text-primary",
                            )}
                          >
                            {contribution.type === "withdrawal" ? "Resgate" : "Aporte"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "font-bold text-sm",
                            contribution.type === "withdrawal"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-primary",
                            contribution.status === "deleted" &&
                              "text-accent line-through opacity-50",
                          )}
                        >
                          {contribution.type === "withdrawal" ? "-" : "+"}
                          {formatCurrency(contribution.amount)}
                        </span>

                        {shouldShowDeleted && contribution.status === "deleted" && onRestoreContribution && (
                          <Button
                            onClick={() => onRestoreContribution(goal.id, contribution.id)}
                            variant="ghost"
                            size="sm"
                            className="p-1.5 hover:text-primary text-muted-foreground"
                            title={
                              contribution.type === "withdrawal"
                                ? "Restaurar resgate (debitar da meta novamente)"
                                : "Restaurar aporte"
                            }
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {!isGoalDeleted &&
                          contribution.status !== "deleted" && (
                            <div className="flex items-center gap-1">
                              {contribution.isPaid === false &&
                                contribution.transactionId && (
                                  <Button
                                    onClick={() =>
                                      onUpdatePaymentStatus(
                                        contribution.transactionId!,
                                        true,
                                      )
                                    }
                                    variant="ghost"
                                    size="sm"
                                    className="p-1.5"
                                    title="Marcar como pago"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              <Button
                                onClick={() =>
                                  handleEditContribution(contribution)
                                }
                                variant="ghost"
                                size="sm"
                                className="p-1.5"
                                title={
                                  contribution.type === "withdrawal"
                                    ? "Editar resgate"
                                    : "Editar aporte"
                                }
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                onClick={() =>
                                  handleDeleteContribution(contribution)
                                }
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "p-1.5",
                                  contribution.type === "withdrawal"
                                    ? "text-amber-600 hover:text-amber-700 dark:text-amber-400"
                                    : "hover:text-accent",
                                )}
                                title={
                                  contribution.type === "withdrawal"
                                    ? "Reverter resgate (devolver o valor para a meta)"
                                    : "Excluir aporte"
                                }
                              >
                                {contribution.type === "withdrawal" ? (
                                  <RotateCcw className="w-3.5 h-3.5" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
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
            <span className="text-accent text-xs font-bold uppercase tracking-widest">
              Meta Excluída
            </span>
          </div>
        ) : isGoalArchived ? (
          <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/20">
            <div className="flex items-center gap-2 text-primary">
              <Archive className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-medium">
                Meta Arquivada — Histórico e saldos protegidos.
              </span>
            </div>
            {onUnarchive && (
              <Button
                onClick={onUnarchive}
                variant="outline"
                size="sm"
                className="text-xs flex items-center gap-1 font-semibold"
              >
                <ArchiveRestore className="w-3.5 h-3.5" />
                Desarquivar
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {goal.currentAmount === 0 &&
              (goal.contributions || []).some(
                (c) => c.status !== "deleted",
              ) && (
                <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 flex items-center justify-between gap-2">
                  <span className="text-xs text-foreground/80">
                    Saldo zerado após resgate total.
                  </span>
                  {onArchive && (
                    <Button
                      onClick={onArchive}
                      variant="outline"
                      size="sm"
                      className="text-xs flex items-center gap-1.5 font-bold flex-shrink-0"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      Arquivar Meta
                    </Button>
                  )}
                </div>
              )}
            {isComplete && (
              <div className="text-center py-2.5 bg-primary/10 rounded-xl border border-primary/20 animate-pulse">
                <span className="text-primary text-sm font-bold">
                  🎉 Meta Concluída com Sucesso!
                </span>
              </div>
            )}

            {!movementMode ? (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => {
                    setMovementMode("deposit");
                    setInitialMovementAmount(0);
                    setMovementDate(getBrazilDateString());
                  }}
                  disabled={isComplete}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Aporte
                </Button>

                <Button
                  onClick={() => {
                    setMovementMode("withdrawal");
                    setInitialMovementAmount(0);
                    setMovementDate(getBrazilDateString());
                  }}
                  disabled={goal.currentAmount <= 0}
                  variant="outline"
                  className="w-full hover:border-amber-500 hover:text-amber-500"
                >
                  <Minus className="w-4 h-4 mr-1.5" />
                  Resgatar
                </Button>
              </div>
            ) : (
              <div
                className="p-3 rounded-xl border-2 border-dashed space-y-3 animate-in slide-in-from-top-2 duration-200"
                style={{ borderColor: theme.cardBorder }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    {movementMode === "deposit" ? (
                      <>
                        <Plus className="w-3.5 h-3.5 text-primary" />
                        Novo Aporte (Guardar)
                      </>
                    ) : (
                      <>
                        <Minus className="w-3.5 h-3.5 text-amber-500" />
                        Novo Resgate (Sacar)
                      </>
                    )}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-muted-foreground">
                    {movementMode === "deposit"
                      ? `Restante: ${formatCurrency(remainingAmount)}`
                      : `Disponível: ${formatCurrency(goal.currentAmount)}`}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Input
                    {...movementAmountInputProps}
                    placeholder="Valor"
                    className="py-2"
                    autoFocus
                  />
                  <Button
                    onClick={handleSaveMovement}
                    disabled={
                      movementAmountValue <= 0 ||
                      (movementMode === "withdrawal" && movementAmountValue > goal.currentAmount) ||
                      (movementMode === "deposit" && movementAmountValue > remainingAmount + 0.01)
                    }
                    size="sm"
                    className={cn(
                      "px-3",
                      movementMode === "withdrawal" && "bg-amber-600 hover:bg-amber-700 text-white",
                    )}
                  >
                    Confirmar
                  </Button>
                  <Button
                    onClick={() => {
                      setMovementMode(null);
                      setInitialMovementAmount(0);
                      setMovementDate(getBrazilDateString());
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
                    value={movementDate}
                    onChange={(e) => setMovementDate(e.target.value)}
                    className="py-1.5"
                  />
                </div>

                {movementMode === "deposit" && movementAmountValue > remainingAmount + 0.01 && (
                  <p className="text-[11px] text-rose-500 font-medium">
                    Valor ultrapassa o restante da meta ({formatCurrency(remainingAmount)}).
                  </p>
                )}

                {movementMode === "withdrawal" && movementAmountValue > goal.currentAmount && (
                  <p className="text-[11px] text-rose-500 font-medium">
                    Valor ultrapassa o saldo disponível na meta ({formatCurrency(goal.currentAmount)}).
                  </p>
                )}

                <p className="text-[10px] text-muted-foreground font-medium italic">
                  {movementMode === "deposit"
                    ? "* O aporte será deduzido do saldo do mês selecionado e guardado nesta meta."
                    : "* O valor resgatado sairá da meta e entrará no saldo disponível do mês selecionado."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={Boolean(contributionToDelete)}
        onClose={() => setContributionToDelete(null)}
        onConfirm={handleConfirmDeleteContribution}
        title={
          contributionToDelete?.type === "withdrawal"
            ? "Reverter Resgate"
            : "Confirmar Exclusão"
        }
        message={
          contributionToDelete?.type === "withdrawal"
            ? `Deseja reverter este resgate de ${formatCurrency(contributionToDelete.amount)}? O valor será devolvido à meta e a receita correspondente será cancelada.`
            : `Tem certeza de que deseja excluir este aporte de ${formatCurrency(contributionToDelete?.amount || 0)}?`
        }
        confirmText={
          contributionToDelete?.type === "withdrawal"
            ? "Reverter Resgate"
            : "Confirmar Exclusão"
        }
        confirmVariant={
          contributionToDelete?.type === "withdrawal" ? "accent" : "danger"
        }
      />
    </Card>
  );
};

export default SavingsGoals;
