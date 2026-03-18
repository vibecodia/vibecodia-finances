import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/helpers';

import { useLocalStorage } from './trello/useLocalStorage';

export const useCategories = () => {
  // Use a manageable list that starts with standard categories
  const [expenseCategories, setExpenseCategories] = useLocalStorage<string[]>('manageable_expense_categories', EXPENSE_CATEGORIES);
  const [incomeCategories, setIncomeCategories] = useLocalStorage<string[]>('manageable_income_categories', INCOME_CATEGORIES);

  const addCategory = (type: 'expense' | 'income', newCategory: string) => {
    const list = type === 'expense' ? expenseCategories : incomeCategories;
    const setList = type === 'expense' ? setExpenseCategories : setIncomeCategories;

    const trimmed = newCategory.trim();
    if (!trimmed || list.includes(trimmed)) return false;
    
    setList([...list, trimmed]);
    return true;
  };

  const removeCategory = (type: 'expense' | 'income', categoryToRemove: string, transactions: any[]) => {
    // Check if category is in use
    const isInUse = transactions.some(t => t.type === type && t.category === categoryToRemove);
    
    if (isInUse) {
      return { 
        success: false, 
        message: `Não é possível excluir a categoria "${categoryToRemove}" pois ela está sendo usada em transações existentes.` 
      };
    }

    if (type === 'expense') {
      setExpenseCategories(expenseCategories.filter(cat => cat !== categoryToRemove));
    } else {
      setIncomeCategories(incomeCategories.filter(cat => cat !== categoryToRemove));
    }
    
    return { success: true };
  };

  const resetToDefaults = (type: 'expense' | 'income', transactions: any[]) => {
    const defaults = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    const setList = type === 'expense' ? setExpenseCategories : setIncomeCategories;

    // Get all categories of this type that are currently in use
    const usedCategories = Array.from(new Set(
      transactions
        .filter(t => t.type === type)
        .map(t => t.category)
    ));

    // Combine defaults with used categories that might not be in the default list
    const newList = Array.from(new Set([...defaults, ...usedCategories]));
    
    setList(newList);
    
    // Return counts for feedback
    return {
      restored: defaults.length,
      preserved: usedCategories.filter(cat => !defaults.includes(cat)).length
    };
  };

  return {
    expenseCategories,
    incomeCategories,
    addCategory,
    removeCategory,
    resetToDefaults
  };
};
