import { useCategoriesContext } from "../contexts/CategoriesContext";
import { Category, Transaction } from "../types";

// Hook de meios de pagamento. Wrapper sobre o CategoriesContext — meios de
// pagamento são Category com type === "payment_method". Mesma assinatura
// usada pelos componentes (Settings, TransactionForm).
export const usePaymentMethods = () => {
  const {
    paymentMethods,
    addCategory,
    updateCategory,
    removeCategory,
    resetToDefaults,
  } = useCategoriesContext();

  return {
    paymentMethods,
    addPaymentMethod: (name: string, data?: Partial<Category>) =>
      addCategory("payment_method", { name, ...data }),
    updatePaymentMethod: (nameOrCode: string, data: Partial<Category>) =>
      updateCategory("payment_method", nameOrCode, data),
    removePaymentMethod: (nameOrCode: string, transactions?: Transaction[]) =>
      removeCategory("payment_method", nameOrCode, transactions),
    resetToDefaults: (transactions?: Transaction[]) =>
      resetToDefaults("payment_method", transactions),
  };
};
