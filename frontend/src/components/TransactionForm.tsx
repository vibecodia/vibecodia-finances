import { addMonths } from "date-fns";
import {
  Plus,
  Minus,
  X,
  CreditCard,
  Calculator,
  Wallet,
  Receipt,
  AlertCircle,
  Repeat,
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";

import { useTheme } from "../contexts/ThemeContext";
import { useCategories } from "../hooks/useCategories";
import { useCurrencyInput } from "../hooks/useCurrencyInput";
import { usePaymentMethods } from "../hooks/usePaymentMethods";
import { cn } from "../lib/utils";
import { SavingsGoal, Transaction, PaymentMethod, StructuredNotes } from "../types";
import {
  getCategoryName,
  getPassiveIncomeCategory,
  isPassiveIncome,
  isSavingsContribution,
  isSavingsWithdrawal,
} from "../utils/categoryUtils";
import {
  formatCurrency,
  getBrazilDateString,
  parseLocalDate,
} from "../utils/helpers";

import { FallingItems } from "./FallingItems";
import ImageUpload from "./ImageUpload";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { Textarea } from "./ui/Textarea";


interface TransactionFormProps {
  type: "expense" | "income";
  transaction?: Transaction | null;
  replicateTransaction?: Transaction | null; // New prop for replication
  savingsGoals?: SavingsGoal[];
  submitError?: string | null;
  onSubmit: (
    transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
  ) => void | Promise<void>;
  onClose: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  type,
  transaction,
  replicateTransaction,
  savingsGoals = [],
  submitError,
  onSubmit,
  onClose,
}) => {
  const { theme } = useTheme();
  const { expenseCategories, incomeCategories, addCategory } = useCategories();
  const { paymentMethods, addPaymentMethod } = usePaymentMethods();

  const categories = type === "expense" ? expenseCategories : incomeCategories;

  const defaultPaymentMethod = paymentMethods.some((p) => p.name === "PIX")
    ? "PIX"
    : paymentMethods[0]?.name || "";
  const submitErrorRef = useRef<HTMLDivElement | null>(null);

  const [formData, setFormData] = useState<{
    description: string;
    category: string;
    savingsGoalId: string;
    date: string;
    dueDate: string;
    isPaid: boolean;
    paymentMethod: PaymentMethod;
    notes: string | StructuredNotes | Record<string, unknown>;
  }>({
    description: "",
    category: "",
    savingsGoalId: "",
    date: getBrazilDateString(),
    dueDate: getBrazilDateString(),
    isPaid: type === "expense" ? false : false, // Receitas e despesas são marcadas como não pagas por padrão
    paymentMethod: defaultPaymentMethod,
    notes: "",
  });

  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorInput, setCalculatorInput] = useState(0);
  const [currentSum, setCurrentSum] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationCategory, setAnimationCategory] = useState("");
  const [animationMode, setAnimationMode] = useState<"10s" | "15s" | "zen">(
    "10s",
  );
  const [repeatMonths, setRepeatMonths] = useState(1);

  // Criação on the fly de categoria / meio de pagamento a partir do dropdown.
  const CREATE_CATEGORY_OPTION = "__create_category__";
  const CREATE_PAYMENT_METHOD_OPTION = "__create_payment_method__";
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryCreateError, setCategoryCreateError] = useState<string | null>(
    null,
  );
  const [creatingPaymentMethod, setCreatingPaymentMethod] = useState(false);
  const [newPaymentMethodName, setNewPaymentMethodName] = useState("");
  const [paymentCreateError, setPaymentCreateError] = useState<string | null>(
    null,
  );

  const [initialAmount, setInitialAmount] = useState<number>(
    transaction?.amount ?? replicateTransaction?.amount ?? 0,
  );
  const {
    inputProps: amountInputProps,
    numericValue: amountValue,
    setNumericValue: setAmountValue,
  } = useCurrencyInput(initialAmount);

  const {
    inputProps: calculatorInputProps,
    numericValue: calculatorAmountValue,
    setNumericValue: setCalculatorValue,
  } = useCurrencyInput(calculatorInput);

  useEffect(() => {
    if (!submitError) return;
    window.setTimeout(() => {
      submitErrorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      submitErrorRef.current?.focus({ preventScroll: true });
    }, 0);
  }, [submitError]);

  // Populate form when editing
  useEffect(() => {
    if (transaction) {
      setFormData({
        description: transaction.description,
        category: getCategoryName(categories, transaction.category),
        savingsGoalId: transaction.savingsGoalId || "",
        date: getBrazilDateString(new Date(transaction.date)),
        dueDate: transaction.dueDate
          ? getBrazilDateString(new Date(transaction.dueDate))
          : "",
        isPaid: transaction.isPaid,
        paymentMethod:
          getCategoryName(categories, transaction.paymentMethod) ||
          defaultPaymentMethod,
        notes: transaction.notes || "",
      });
      setInitialAmount(transaction.amount);
    } else if (replicateTransaction) {
      const isSimulated = replicateTransaction.id === "simulated";
      const originalDate = new Date(replicateTransaction.date);
      const nextMonthDate = isSimulated
        ? originalDate
        : addMonths(originalDate, 1);
      const nextMonthDateString = getBrazilDateString(nextMonthDate);

      const originalDueDate = replicateTransaction.dueDate
        ? new Date(replicateTransaction.dueDate)
        : null;
      const nextMonthDueDateString = originalDueDate
        ? getBrazilDateString(
            isSimulated ? originalDueDate : addMonths(originalDueDate, 1),
          )
        : "";

      setFormData({
        description: replicateTransaction.description,
        category: getCategoryName(categories, replicateTransaction.category),
        savingsGoalId: replicateTransaction.savingsGoalId || "",
        date: nextMonthDateString,
        dueDate: nextMonthDueDateString,
        isPaid: isSimulated ? replicateTransaction.isPaid : false,
        paymentMethod:
          getCategoryName(categories, replicateTransaction.paymentMethod) ||
          defaultPaymentMethod,
        notes: replicateTransaction.notes || "",
      });
      setInitialAmount(replicateTransaction.amount);
    } else {
      // Reset form for new transaction
      setFormData({
        description: "",
        category: "",
        savingsGoalId: "",
        date: getBrazilDateString(),
        dueDate: getBrazilDateString(),
        isPaid: type === "expense" ? false : false,
        paymentMethod: defaultPaymentMethod,
        notes: "",
      });
      setInitialAmount(0);
      setCurrentSum(0);
      setCalculatorInput(0);
    }
  }, [transaction, replicateTransaction, type, defaultPaymentMethod]);

  useEffect(() => {
    if (formData.savingsGoalId && amountValue > 0) {
      const goal = savingsGoals.find(
        (g) => (g.id || g._id) === formData.savingsGoalId,
      );
      if (goal) {
        if (isSavingsContribution(formData.category, categories)) {
          const remaining = goal.targetAmount - goal.currentAmount;
          if (amountValue > remaining + 0.01) {
            setLocalError(
              `Valor do aporte ultrapassa o restante da meta. Restante disponível: ${remaining.toFixed(2)}.`,
            );
          } else {
            setLocalError(null);
          }
        } else if (isSavingsWithdrawal(formData.category, categories)) {
          if (amountValue > goal.currentAmount + 0.01) {
            setLocalError(
              `Valor do resgate ultrapassa o saldo disponível na meta. Disponível: ${goal.currentAmount.toFixed(2)}.`,
            );
          } else {
            setLocalError(null);
          }
        } else {
          setLocalError(null);
        }
      }
    } else {
      setLocalError(null);
    }
  }, [amountValue, formData.category, formData.savingsGoalId, savingsGoals, categories]);

  const showGoalSelect =
    (type === "expense" && isSavingsContribution(formData.category, categories)) ||
    (type === "income" && isSavingsWithdrawal(formData.category, categories));

  const activeGoals = savingsGoals
    .filter((g) => (g.status || "active") !== "deleted")
    .filter((g) =>
      type === "income"
        ? (g.currentAmount || 0) > 0
        : (g.currentAmount || 0) < (g.targetAmount || 0),
    );

  const passiveIncomeSuggestions =
    getPassiveIncomeCategory(categories)?.descriptionSuggestions?.length
      ? getPassiveIncomeCategory(categories)!.descriptionSuggestions!
      : [
          "Rendimentos simples",
          "Rendimento semanal cofrinhos",
          "Rendimento quinzenal cofrinhos",
          "Rendimento mensal cofrinhos",
        ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      amountValue === 0 ||
      !formData.description ||
      !formData.category ||
      localError
    ) {
      return;
    }
    if (showGoalSelect && !formData.savingsGoalId) {
      return;
    }

    let finalDueDate = formData.dueDate;
    if (type === "expense" && !formData.isPaid && !finalDueDate) {
      finalDueDate = getBrazilDateString();
    }

    // Garante que a data principal seja a data de vencimento para despesas
    const finalDate =
      type === "expense"
        ? finalDueDate || getBrazilDateString()
        : formData.date;

    try {
      const count = transaction ? 1 : repeatMonths > 0 ? repeatMonths : 1;

      for (let i = 0; i < count; i++) {
        const currentDate = parseLocalDate(finalDate);
        const currentDueDate = finalDueDate
          ? parseLocalDate(finalDueDate)
          : null;

        const newDate = getBrazilDateString(addMonths(currentDate, i));
        const newDueDate = currentDueDate
          ? getBrazilDateString(addMonths(currentDueDate, i))
          : undefined;

        const finalDescription =
          count > 1
            ? `${formData.description} ${i + 1}/${count}`
            : formData.description;

        await onSubmit({
          type,
          amount: amountValue,
          description: finalDescription,
          category: formData.category,
          date: newDate,
          dueDate: type === "expense" ? newDueDate || undefined : undefined,
          isPaid: i === 0 ? formData.isPaid : false,
          recurrence: "none",
          paymentMethod: formData.paymentMethod || undefined,
          notes: formData.notes,
          savingsGoalId: showGoalSelect ? formData.savingsGoalId : undefined,
        });
      }

      // Somente anima se não houver erro de submissão imediato (embora o erro possa vir via prop)
      // Se o pai capturou o erro e setou submitError, o componente vai re-renderizar
      // e podemos checar se submitError mudou, mas o try/catch aqui é mais imediato.

      const ninjaGameEnabled =
        localStorage.getItem("ninjaGameEnabled") === "true";
      const ninjaGameMode =
        (localStorage.getItem("ninjaGameMode") as "10s" | "15s" | "zen") ||
        "10s";

      if (ninjaGameEnabled) {
        setAnimationCategory(formData.category);
        setAnimationMode(ninjaGameMode);
        setIsAnimating(true);

        if (ninjaGameMode === "10s") {
          setTimeout(() => onClose(), 10000);
        } else if (ninjaGameMode === "15s") {
          setTimeout(() => onClose(), 15000);
        }
        // No Zen mode, we don't call onClose automatically
      } else {
        onClose();
      }
    } catch (error) {
      // O erro é tratado no pai e refletido via prop submitError
      console.error("Submit error:", error);
    }
  };

  const handleReceiptDetected = (data: {
    description: string;
    amount: number;
    date: string;
    category?: string;
    notes?: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      description: data.description || prev.description,
      dueDate: data.date || prev.dueDate,
      date: data.date || prev.date,
      category: data.category || prev.category,
      notes: data.notes || prev.notes,
      // Se detectou recibo, geralmente é porque já foi pago (Mercado, Posto, etc)
      isPaid: true,
    }));

    // Atualiza o valor numérico diretamente no hook para garantir a população
    const amount = Number(data.amount) || 0;
    setAmountValue(amount);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type: inputType } = e.target;

    // Opções especiais do dropdown → abre o formulário de criação on the fly.
    // (Não altera o valor do campo; o select volta ao valor anterior.)
    if (name === "category" && value === CREATE_CATEGORY_OPTION) {
      setCreatingCategory(true);
      return;
    }
    if (name === "paymentMethod" && value === CREATE_PAYMENT_METHOD_OPTION) {
      setCreatingPaymentMethod(true);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]:
        inputType === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
      ...(name === "category" &&
      !isSavingsContribution(value, categories)
        ? { savingsGoalId: "" }
        : {}),
    }));
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    const ok = await addCategory(type, name);
    if (ok) {
      setFormData((prev) => ({ ...prev, category: name, savingsGoalId: "" }));
      setNewCategoryName("");
      setCategoryCreateError(null);
      setCreatingCategory(false);
    } else {
      setCategoryCreateError(
        "Já existe uma categoria com esse nome. Escolha outro.",
      );
    }
  };

  const handleCreatePaymentMethod = async () => {
    const name = newPaymentMethodName.trim();
    if (!name) return;
    const ok = await addPaymentMethod(name);
    if (ok) {
      setFormData((prev) => ({ ...prev, paymentMethod: name }));
      setNewPaymentMethodName("");
      setPaymentCreateError(null);
      setCreatingPaymentMethod(false);
    } else {
      setPaymentCreateError(
        "Já existe um meio de pagamento com esse nome. Escolha outro.",
      );
    }
  };

  const handleAddNumber = () => {
    if (calculatorAmountValue > 0) {
      setCurrentSum((prevSum) => prevSum + calculatorAmountValue);
      setCalculatorValue(0);
    }
  };

  const handleSubtractNumber = () => {
    if (calculatorAmountValue > 0) {
      setCurrentSum((prevSum) => prevSum - calculatorAmountValue);
      setCalculatorValue(0);
    }
  };

  const handleApplyCalculation = () => {
    setAmountValue(currentSum);
    setCurrentSum(0);
    setCalculatorValue(0);
    setShowCalculator(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-300">
      <FallingItems
        isVisible={isAnimating}
        category={animationCategory}
        mode={animationMode}
        categories={categories}
        onComplete={() => {
          setIsAnimating(false);
          if (animationMode === "zen") {
            onClose();
          }
        }}
      />

      <Card
        className={cn(
          "w-full max-w-md p-8 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 transition-all",
          isAnimating && "opacity-0 scale-90",
        )}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2.5 rounded-xl text-white shadow-lg",
                type === "expense" ? "bg-accent" : "bg-primary",
              )}
            >
              {type === "expense" ? (
                <Receipt className="w-6 h-6" />
              ) : (
                <Wallet className="w-6 h-6" />
              )}
            </div>
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
              {transaction ? "Editar" : "Nova"}{" "}
              {type === "expense" ? "Despesa" : "Receita"}
            </h2>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            disabled={isAnimating}
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {(submitError || localError) && (
            <div
              ref={submitErrorRef}
              tabIndex={-1}
              role="alert"
              aria-live="assertive"
              className="rounded-2xl border-2 px-4 py-3 text-xs font-bold uppercase tracking-tight outline-none flex items-center gap-3 animate-in shake duration-300"
              style={{
                borderColor: theme.accent,
                color: theme.accent,
                backgroundColor: theme.accent + "10",
              }}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {submitError || localError}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-end gap-3">
              <Input
                {...amountInputProps}
                label="Valor (R$)"
                name="amount"
                placeholder="0,00"
                className="text-2xl font-black"
                disabled={isAnimating}
                required
              />
              <Button
                type="button"
                onClick={() => setShowCalculator(!showCalculator)}
                size="icon"
                className="h-14 w-14 flex-shrink-0 rounded-xl shadow-md"
                title="Abrir Calculadora"
                disabled={isAnimating}
              >
                <Calculator className="w-6 h-6" />
              </Button>
            </div>

            {showCalculator && (
              <Card
                className="p-5 border-2 border-dashed space-y-4 animate-in slide-in-from-top-2 duration-200"
                style={{ borderColor: theme.cardBorder }}
              >
                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                  Calculadora
                </h4>
                <div className="flex items-center gap-2">
                  <Input
                    {...calculatorInputProps}
                    placeholder="Valor"
                    className="font-bold flex-1"
                    disabled={isAnimating}
                  />
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      onClick={handleAddNumber}
                      size="icon"
                      className="h-12 w-12 flex-shrink-0 bg-primary/20 hover:bg-primary/30 text-primary border-0"
                      title="Adicionar"
                      disabled={isAnimating}
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSubtractNumber}
                      size="icon"
                      className="h-12 w-12 flex-shrink-0 bg-accent/20 hover:bg-accent/30 text-accent border-0"
                      title="Subtrair"
                      disabled={isAnimating}
                    >
                      <Minus className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
                  <span className="text-[10px] font-black uppercase opacity-40">
                    Soma Atual
                  </span>
                  <span className="text-lg font-black text-primary">
                    {formatCurrency(currentSum)}
                  </span>
                </div>
                <Button
                  type="button"
                  onClick={handleApplyCalculation}
                  variant="outline"
                  className="w-full text-xs font-black uppercase"
                  disabled={isAnimating}
                >
                  Aplicar ao Valor
                </Button>
              </Card>
            )}
          </div>

          <Select
            label="Categoria"
            name="category"
            value={formData.category}
            onChange={handleChange}
            disabled={isAnimating}
            required
          >
            <option value="">Selecione uma categoria</option>
            {categories.map((category) => {
              const catName = getCategoryName(categories, category);
              const emoji =
                typeof category === "string"
                  ? ""
                  : category?.emoji || "";
              return (
                <option key={catName} value={catName}>
                  {emoji ? `${emoji} ` : ""}
                  {catName}
                </option>
              );
            })}
            <option value={CREATE_CATEGORY_OPTION}>
              ➕ Criar nova categoria...
            </option>
          </Select>

          {creatingCategory && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <Input
                label="Nome da nova categoria"
                type="text"
                value={newCategoryName}
                onChange={(e) => {
                  setNewCategoryName(e.target.value);
                  setCategoryCreateError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateCategory();
                  }
                }}
                placeholder={`Ex: ${type === "expense" ? "Pets" : "Freelance"}`}
                error={categoryCreateError ?? undefined}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleCreateCategory}
                  variant="primary"
                  size="sm"
                  disabled={isAnimating}
                >
                  Criar categoria
                </Button>
                <Button
                  type="button"
                  onClick={() => setCreatingCategory(false)}
                  variant="ghost"
                  size="sm"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Input
              label="Descrição"
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Ex: Compras no supermercado"
              disabled={isAnimating}
              required
            />
            {type === "income" &&
              isPassiveIncome(formData.category, categories) && (
              <div className="flex flex-wrap gap-2 pt-1">
                {passiveIncomeSuggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        description: suggestion,
                      }))
                    }
                    variant="ghost"
                    size="sm"
                    className="px-3 py-1.5 rounded-full text-[10px] uppercase font-black border border-border"
                    disabled={isAnimating}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {showGoalSelect && (
            <Select
              label="Meta para o aporte"
              name="savingsGoalId"
              value={formData.savingsGoalId}
              onChange={handleChange}
              disabled={isAnimating}
              required
            >
              <option value="">Selecione uma meta</option>
              {activeGoals.map((goal) => {
                const id = goal.id || goal._id || "";
                return (
                  <option key={id} value={id}>
                    {goal.name}: {formatCurrency(goal.currentAmount)} /{" "}
                    {formatCurrency(goal.targetAmount)}
                  </option>
                );
              })}
            </Select>
          )}

          <Select
            label={
              type === "expense"
                ? "Meio de Pagamento"
                : "Conta / Meio de Recebimento (Opcional)"
            }
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={handleChange}
            disabled={isAnimating}
            required={type === "expense"}
          >
            <option value="">
              {type === "expense"
                ? "Selecione um meio de pagamento"
                : "Selecione a conta/cartão (opcional)"}
            </option>
            {paymentMethods.map((method) => {
              const methodName = getCategoryName(paymentMethods, method);
              const methodEmoji =
                typeof method === "string" ? "" : method?.emoji || "";
              return (
                <option key={methodName} value={methodName}>
                  {methodEmoji ? `${methodEmoji} ` : ""}
                  {methodName}
                </option>
              );
            })}
            <option value={CREATE_PAYMENT_METHOD_OPTION}>
              ➕ Criar novo meio de pagamento...
            </option>
          </Select>

          {creatingPaymentMethod && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <Input
                label="Nome do novo meio de pagamento"
                type="text"
                value={newPaymentMethodName}
                onChange={(e) => {
                  setNewPaymentMethodName(e.target.value);
                  setPaymentCreateError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreatePaymentMethod();
                  }
                }}
                placeholder="Ex: Itaú"
                error={paymentCreateError ?? undefined}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleCreatePaymentMethod}
                  variant="primary"
                  size="sm"
                  disabled={isAnimating}
                >
                  Criar meio de pagamento
                </Button>
                <Button
                  type="button"
                  onClick={() => setCreatingPaymentMethod(false)}
                  variant="ghost"
                  size="sm"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {type === "income" && (
            <Input
              label="Data da Receita"
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              disabled={isAnimating}
              required
            />
          )}

          {type === "expense" && (
            <Input
              label="Data de Vencimento"
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              disabled={isAnimating}
              required={!formData.isPaid}
            />
          )}

          {type === "expense" && (
            <div className="space-y-3">
              <label className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Capturar via QR Code
              </label>
              <ImageUpload
                onReceiptDetected={handleReceiptDetected}
                onUploadError={(error) => console.error(error)}
                disabled={true}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Textarea
              label="Notas"
              name="notes"
              value={typeof formData.notes === "string" ? formData.notes : ""}
              onChange={handleChange}
              placeholder="Adicione observações importantes aqui..."
              disabled={isAnimating}
              maxLength={1000}
              className="min-h-[100px] text-sm font-bold"
            />
            <div className="flex justify-end pr-1">
              <span
                className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  (typeof formData.notes === "string"
                    ? formData.notes.length
                    : 0) >= 1000
                    ? "text-accent"
                    : "text-muted-foreground opacity-40",
                )}
              >
                {typeof formData.notes === "string"
                  ? formData.notes.length
                  : 0}
                /1000
              </span>
            </div>
          </div>

          {/* Opção de repetir por meses (apenas se for nova transação) */}
          {!transaction && (
            <div className="space-y-4 p-5 rounded-2xl border-2 border-dashed bg-muted/5 border-border animate-in slide-in-from-bottom-2 duration-300">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                <Repeat className="w-4 h-4 text-primary" />
                Repetir Lançamento
              </label>

              <div className="flex items-center gap-4">
                <div className="flex-1 flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    onClick={() =>
                      setRepeatMonths(Math.max(1, repeatMonths - 1))
                    }
                    disabled={repeatMonths <= 1 || isAnimating}
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0 rounded-xl"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-10 text-center font-black text-lg text-foreground">
                    {repeatMonths}
                  </span>
                  <Button
                    type="button"
                    onClick={() =>
                      setRepeatMonths(Math.min(60, repeatMonths + 1))
                    }
                    disabled={repeatMonths >= 60 || isAnimating}
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0 rounded-xl"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex-[2] space-y-0.5">
                  <p className="text-sm font-black text-foreground uppercase tracking-tight">
                    {repeatMonths === 1
                      ? "Apenas uma vez"
                      : `Por ${repeatMonths} meses`}
                  </p>
                  <p className="text-[10px] text-foreground opacity-40 font-bold uppercase">
                    {repeatMonths === 1
                      ? "Lançamento único"
                      : `Criará ${repeatMonths} registros`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Checkbox para "Pago" ou "Recebido" */}
          <div
            className={cn(
              "flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer group",
              formData.isPaid
                ? "bg-primary/5 border-primary shadow-sm"
                : "bg-card border-border",
              isAnimating && "pointer-events-none",
            )}
            onClick={() =>
              !isAnimating &&
              setFormData((prev) => ({ ...prev, isPaid: !prev.isPaid }))
            }
          >
            <div
              className={cn(
                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                formData.isPaid
                  ? "bg-primary border-primary"
                  : "bg-transparent border-border group-hover:border-primary",
              )}
            >
              {formData.isPaid && (
                <Plus
                  className="w-4 h-4 text-white rotate-45"
                  style={{ transform: "rotate(0deg)" }}
                />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-foreground uppercase tracking-tight">
                {type === "expense" ? "Já foi pago" : "Já foi recebido"}
              </p>
              <p className="text-[10px] text-foreground opacity-40 font-bold uppercase">
                Marcar como concluído
              </p>
            </div>
            <CreditCard
              className={cn(
                "w-6 h-6 transition-colors",
                formData.isPaid ? "text-primary" : "text-foreground opacity-20",
              )}
            />
          </div>

          <div className="flex gap-4 pt-6 border-t border-border">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isAnimating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                isAnimating ||
                amountValue === 0 ||
                !formData.description ||
                !formData.category ||
                !!localError
              }
              className="flex-1"
            >
              {transaction ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default TransactionForm;
