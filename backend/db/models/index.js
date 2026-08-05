import { categorySchema } from './category.js';
import { pushSubscriptionSchema } from './pushSubscription.js';
import { savingsGoalSchema } from './savingsGoal.js';
import { shoppingItemSchema } from './shoppingItem.js';
import { transactionSchema } from './transaction.js';

// Cache de models compilados por conexão. O código original registrava os
// models a cada request via conn.model(...); aqui compilamos uma única vez
// por conexão com as MESMAS instâncias de schema (singletons) — evita
// OverwriteModelError e recompilação desnecessária, sem mudar comportamento.
const modelsCache = new WeakMap();

export function getModels(conn) {
  if (modelsCache.has(conn)) return modelsCache.get(conn);

  const models = {
    Category: conn.model('Category', categorySchema),
    Transaction: conn.model('Transaction', transactionSchema),
    SavingsGoal: conn.model('SavingsGoal', savingsGoalSchema),
    ShoppingItem: conn.model('ShoppingItem', shoppingItemSchema),
    PushSubscription: conn.model('PushSubscription', pushSubscriptionSchema),
  };

  modelsCache.set(conn, models);
  return models;
}
