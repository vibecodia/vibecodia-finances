import { Router } from 'express';

import { getModels } from '../db/models/index.js';
import { dbMiddleware } from '../middleware/dbMiddleware.js';
import { createTransaction, deleteTransaction, updateTransaction } from '../services/transactions.js';

export function transactionsRouter(connectionManager) {
  const router = Router();
  // dbMiddleware por rota (como no original) para não vazar para outras rotas /api
  const requireDb = dbMiddleware(connectionManager);

  // Transações
  router.get('/', requireDb, async (req, res) => {
    const { search, type } = req.query;
    const { Transaction } = getModels(req.conn);

    let query = {};
    if (type) query.type = type;
    if (search) query.description = { $regex: search, $options: 'i' };

    const transactions = await Transaction.find(query)
      .populate('category')
      .populate('paymentMethod');
    res.json(transactions);
  });

  router.post('/', requireDb, async (req, res) => {
    const newTransaction = await createTransaction(getModels(req.conn), req.body);
    res.status(201).json(newTransaction);
  });

  router.put('/:id', requireDb, async (req, res) => {
    const updatedTransaction = await updateTransaction(getModels(req.conn), req.params.id, req.body);
    if (!updatedTransaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.json(updatedTransaction);
  });

  router.delete('/:id', requireDb, async (req, res) => {
    const deletedTransaction = await deleteTransaction(getModels(req.conn), req.params.id);
    if (!deletedTransaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.json({ message: 'Transaction deleted' });
  });

  return router;
}
