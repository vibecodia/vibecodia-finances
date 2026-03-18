import { useEffect } from 'react';

import { PAYMENT_METHODS, formatPaymentMethod } from '../utils/helpers';

import { useLocalStorage } from './trello/useLocalStorage';

const DEFAULT_PAYMENT_METHODS = PAYMENT_METHODS.map(m => m.label as string);

export const usePaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useLocalStorage<string[]>('manageable_payment_methods', DEFAULT_PAYMENT_METHODS);

  // Automatically normalize the list to labels (migrates legacy IDs to Labels in local storage)
  useEffect(() => {
    const normalized = paymentMethods.map(m => formatPaymentMethod(m));
    const uniqueNormalized = Array.from(new Set(normalized));
    
    // Check if we actually need to update to avoid infinite loops
    if (uniqueNormalized.length !== paymentMethods.length || 
        uniqueNormalized.some((m, i) => m !== paymentMethods[i])) {
      setPaymentMethods(uniqueNormalized);
    }
  }, [paymentMethods, setPaymentMethods]);

  const addPaymentMethod = (newMethod: string) => {
    const trimmed = newMethod.trim();
    if (!trimmed || paymentMethods.includes(trimmed)) return false;
    
    setPaymentMethods([...paymentMethods, trimmed]);
    return true;
  };

  const removePaymentMethod = (methodToRemove: string, transactions: any[]) => {
    // Check if payment method is in use (normalized)
    const isInUse = transactions.some(t => formatPaymentMethod(t.paymentMethod) === methodToRemove);
    
    if (isInUse) {
      return { 
        success: false, 
        message: `Não é possível excluir o meio de pagamento "${methodToRemove}" pois ele está sendo usado em transações existentes.` 
      };
    }

    setPaymentMethods(paymentMethods.filter(m => m !== methodToRemove));
    return { success: true };
  };

  const resetToDefaults = (transactions: any[]) => {
    // Get all payment methods currently in use, normalized to their labels
    const usedMethods = Array.from(new Set(
      transactions
        .filter(t => t.paymentMethod)
        .map(t => formatPaymentMethod(t.paymentMethod as string))
    ));

    // Combine defaults with used methods that might not be in the default list
    const newList = Array.from(new Set([...DEFAULT_PAYMENT_METHODS, ...usedMethods]));
    
    setPaymentMethods(newList);
    
    return {
      restored: DEFAULT_PAYMENT_METHODS.length,
      preserved: usedMethods.filter(m => !(DEFAULT_PAYMENT_METHODS as string[]).includes(m)).length
    };
  };

  return {
    paymentMethods,
    addPaymentMethod,
    removePaymentMethod,
    resetToDefaults
  };
};
