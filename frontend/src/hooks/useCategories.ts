import { useCategoriesContext } from "../contexts/CategoriesContext";

// Hook de categorias. Agora é um wrapper fino sobre o CategoriesContext, que
// carrega do backend (modo autenticado) ou do localStorage (modo guest).
// Mantém a mesma assinatura usada pelos componentes (TransactionForm, Settings,
// Playground) — apenas os dados passam a ser Category[] em vez de string[].
export const useCategories = () => {
  const {
    expenseCategories,
    incomeCategories,
    addCategory,
    updateCategory,
    removeCategory,
    resetToDefaults,
  } = useCategoriesContext();

  return {
    expenseCategories,
    incomeCategories,
    addCategory: (type: "expense" | "income", name: string) =>
      addCategory(type, { name }),
    updateCategory,
    removeCategory,
    resetToDefaults,
  };
};
