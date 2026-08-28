import { Router } from 'express';

import { getModels } from '../db/models/index.js';
import { dbMiddleware } from '../middleware/dbMiddleware.js';
import {
  autoMigrateLegacyCategories,
  createCategory,
  ensureDefaultCategories,
  listCategories,
  softDeleteCategory,
  updateCategory,
} from '../services/categories.js';

// Rotas de categorias (despesas, receitas e meios de pagamento).
// GET dispara o seed dos defaults por conexão (idempotente).
export function categoriesRouter(connectionManager) {
  const router = Router();
  const requireDb = dbMiddleware(connectionManager);

  router.get('/', requireDb, async (req, res) => {
    const models = getModels(req.conn);
    await ensureDefaultCategories(models);
    await autoMigrateLegacyCategories(models, req.conn);
    const categories = await listCategories(models, req.query.type);
    res.json(categories);
  });

  router.post('/', requireDb, async (req, res) => {
    const category = await createCategory(getModels(req.conn), req.body);
    res.status(201).json(category);
  });

  router.put('/:id', requireDb, async (req, res) => {
    const category = await updateCategory(getModels(req.conn), req.params.id, req.body);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  });

  router.delete('/:id', requireDb, async (req, res) => {
    const category = await softDeleteCategory(getModels(req.conn), req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  });

  return router;
}
