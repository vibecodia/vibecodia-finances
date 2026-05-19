import { useEffect } from 'react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/helpers';

import { useLocalStorage } from './trello/useLocalStorage';

export const useCategories = () => {
  // Use a manageable list that starts with standard categories
  const [expenseCategories, setExpenseCategories] = useLocalStorage<any[]>('manageable_expense_categories', EXPENSE_CATEGORIES);
  const [incomeCategories, setIncomeCategories] = useLocalStorage<any[]>('manageable_income_categories', INCOME_CATEGORIES);

  // Normalize categories to strings if they are objects
  useEffect(() => {
    const normalize = (list: any[]) => {
      if (!Array.isArray(list)) return [];
      return list.map(item => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && item.name) return item.name;
        return String(item);
      });
    };

    const normalizedExpense = Array.from(new Set(normalize(expenseCategories)));
    const normalizedIncome = Array.from(new Set(normalize(incomeCategories)));

    // Only update if there was actual change to avoid infinite loops
    const hasExpenseChange = normalizedExpense.length !== expenseCategories.length || normalizedExpense.some((cat, i) => cat !== expenseCategories[i]);
    const hasIncomeChange = normalizedIncome.length !== incomeCategories.length || normalizedIncome.some((cat, i) => cat !== incomeCategories[i]);

    if (hasExpenseChange) setExpenseCategories(normalizedExpense);
    if (hasIncomeChange) setIncomeCategories(normalizedIncome);
  }, [expenseCategories, incomeCategories, setExpenseCategories, setIncomeCategories]);

  // Ensure 'Aporte' is always in expense categories for existing users
  useEffect(() => {
    // Only run this if we have strings (normalization should have handled it or will handle it)
    const normalizedExpense = expenseCategories.map(cat => 
      typeof cat === 'string' ? cat : (cat && (cat as any).name) || 'Categoria'
    );
    
    if (!normalizedExpense.includes('Aporte')) {
      setExpenseCategories(prev => {
        // Double check in prev to avoid race conditions
        const currentNormalized = prev.map(cat => 
          typeof cat === 'string' ? cat : (cat && (cat as any).name) || 'Categoria'
        );
        if (!currentNormalized.includes('Aporte')) {
          return [...prev, 'Aporte'];
        }
        return prev;
      });
    }
  }, [expenseCategories, setExpenseCategories]);

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
      setExpenseCategories(expenseCategories.filter((cat: string) => cat !== categoryToRemove));
    } else {
      setIncomeCategories(incomeCategories.filter((cat: string) => cat !== categoryToRemove));
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
