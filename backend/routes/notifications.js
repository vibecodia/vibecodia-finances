import { Router } from 'express';

import { getModels } from '../db/models/index.js';
import { dbMiddleware } from '../middleware/dbMiddleware.js';
import { sendReminders } from '../services/notifications.js';

export function notificationsRouter(connectionManager) {
  const router = Router();
  // dbMiddleware por rota (como no original) para não vazar para outras rotas /api
  const requireDb = dbMiddleware(connectionManager);

  // Rota para salvar inscrição de Push
  router.post('/subscribe', requireDb, async (req, res) => {
    const { PushSubscription } = getModels(req.conn);
    const { subscription } = req.body;

    if (!subscription) {
      return res.status(400).json({ error: 'Subscription is required' });
    }

    // Evitar duplicatas
    const existing = await PushSubscription.findOne({ 'subscription.endpoint': subscription.endpoint });
    if (existing) {
      return res.status(200).json({ message: 'Subscription already exists' });
    }

    const newSub = new PushSubscription({ subscription });
    await newSub.save();
    res.status(201).json({ message: 'Subscription saved' });
  });

  // Rota para disparar lembretes manualmente (sob demanda)
  router.post('/trigger-reminders', requireDb, async (req, res) => {
    const pin = req.header('x-pin') || req.query.pin;
    await sendReminders(connectionManager, pin);
    res.json({ success: true, message: 'Reminders triggered' });
  });

  return router;
}
