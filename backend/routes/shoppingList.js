import { Router } from 'express';

import { getModels } from '../db/models/index.js';
import { dbMiddleware } from '../middleware/dbMiddleware.js';

export function shoppingListRouter(connectionManager) {
  const router = Router();
  // dbMiddleware por rota (como no original) para não vazar para outras rotas /api
  const requireDb = dbMiddleware(connectionManager);

  // ---------- Lista de Compras ----------
  router.get('/', requireDb, async (req, res) => {
    const { ShoppingItem } = getModels(req.conn);
    const items = await ShoppingItem.find();
    res.json(items);
  });

  router.post('/', requireDb, async (req, res) => {
    const { ShoppingItem } = getModels(req.conn);
    const item = new ShoppingItem({
      name: req.body.name,
      isPriority: req.body.isPriority || false,
      type: req.body.type || 'compras',
    });
    const newItem = await item.save();
    res.status(201).json(newItem);
  });

  router.put('/:id', requireDb, async (req, res) => {
    const { ShoppingItem } = getModels(req.conn);
    const updatedItem = await ShoppingItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedItem) {
      return res.status(404).json({ message: 'Shopping item not found' });
    }
    res.json(updatedItem);
  });

  router.delete('/purchased', requireDb, async (req, res) => {
    const { ShoppingItem } = getModels(req.conn);
    await ShoppingItem.deleteMany({ purchased: true });
    res.json({ message: 'Purchased items cleared' });
  });

  router.delete('/:id', requireDb, async (req, res) => {
    const { ShoppingItem } = getModels(req.conn);
    const deletedItem = await ShoppingItem.findByIdAndDelete(req.params.id);
    if (!deletedItem) {
      return res.status(404).json({ message: 'Shopping item not found' });
    }
    res.json({ message: 'Shopping item deleted' });
  });

  return router;
}
