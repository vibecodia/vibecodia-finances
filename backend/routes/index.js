import { Router } from 'express';

import { adminRouter } from './admin.js';
import { aiProxyRouter } from './aiProxy.js';
import { categoriesRouter } from './categories.js';
import { goalsRouter } from './goals.js';
import { healthRouter } from './health.js';
import { notificationsRouter } from './notifications.js';
import { receiptRouter } from './receipt.js';
import { shoppingListRouter } from './shoppingList.js';
import { transactionsRouter } from './transactions.js';
import { verifyPinRouter } from './verifyPin.js';

// Monta todas as rotas da API sob o prefixo /api.
// deps: { connectionManager, vapidPublicKey, hasPin }
export function apiRouter(deps) {
  const router = Router();

  router.use('/verify-pin', verifyPinRouter({ vapidPublicKey: deps.vapidPublicKey, hasPin: deps.hasPin }));
  router.use('/notifications', notificationsRouter(deps.connectionManager));
  router.use('/admin', adminRouter(deps.connectionManager));
  router.use('/categories', categoriesRouter(deps.connectionManager));
  router.use('/transactions', transactionsRouter(deps.connectionManager));
  router.use('/goals', goalsRouter(deps.connectionManager));
  router.use('/shopping-list', shoppingListRouter(deps.connectionManager));
  router.use('/fetch-receipt-data', receiptRouter());
  router.use('/ai-proxy', aiProxyRouter());
  router.use('/health-check', healthRouter());

  return router;
}
