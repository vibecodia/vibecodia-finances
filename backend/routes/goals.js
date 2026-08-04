import { Router } from 'express';

import { getModels } from '../db/models/index.js';
import { dbMiddleware } from '../middleware/dbMiddleware.js';
import {
  addContribution,
  createGoal,
  deleteContribution,
  deleteGoal,
  listGoals,
  updateContribution,
  updateGoal,
} from '../services/goals.js';

export function goalsRouter(connectionManager) {
  const router = Router();
  // dbMiddleware por rota (como no original) para não vazar para outras rotas /api
  const requireDb = dbMiddleware(connectionManager);

  // ---------- Metas de Poupança ----------
  router.get('/', requireDb, async (req, res) => {
    const filteredGoals = await listGoals(getModels(req.conn));
    res.json(filteredGoals);
  });

  router.post('/', requireDb, async (req, res) => {
    const newGoal = await createGoal(getModels(req.conn), req.body);
    res.status(201).json(newGoal);
  });

  router.put('/:id', requireDb, async (req, res) => {
    const goal = await updateGoal(getModels(req.conn), req.params.id, req.body);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    res.json(goal);
  });

  router.delete('/:id', requireDb, async (req, res) => {
    const goal = await deleteGoal(getModels(req.conn), req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    res.json({ message: 'Savings goal and its contributions/transactions deleted' });
  });

  router.post('/:id/contributions', requireDb, async (req, res) => {
    const goal = await addContribution(getModels(req.conn), req.params.id, req.body);
    res.status(201).json(goal);
  });

  router.put('/:goalId/contributions/:contributionId', requireDb, async (req, res) => {
    const goal = await updateContribution(
      getModels(req.conn),
      req.params.goalId,
      req.params.contributionId,
      req.body
    );
    res.json(goal);
  });

  router.delete('/:goalId/contributions/:contributionId', requireDb, async (req, res) => {
    const goal = await deleteContribution(getModels(req.conn), req.params.goalId, req.params.contributionId);
    res.json(goal);
  });

  return router;
}
