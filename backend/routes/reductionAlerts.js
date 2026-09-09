import { Router } from 'express';

import { getModels } from '../db/models/index.js';
import { dbMiddleware } from '../middleware/dbMiddleware.js';

export function reductionAlertsRouter(connectionManager) {
  const router = Router();
  const requireDb = dbMiddleware(connectionManager);

  // GET /api/reduction-alerts
  router.get('/', requireDb, async (req, res) => {
    try {
      const { ReductionAlert } = getModels(req.conn);
      const config = await ReductionAlert.findOne().sort({ updatedAt: -1 });

      if (!config) {
        return res.json({
          enabled: false,
          monitoredPaymentMethods: [],
          plansByMonth: {},
        });
      }

      res.json({
        enabled: Boolean(config.enabled),
        monitoredPaymentMethods: Array.isArray(config.monitoredPaymentMethods)
          ? config.monitoredPaymentMethods
          : [],
        plansByMonth: config.plansByMonth || {},
      });
    } catch (error) {
      console.error('Erro ao buscar alerta de redução:', error);
      res.status(500).json({ error: 'Erro ao buscar configurações de redução' });
    }
  });

  // PUT /api/reduction-alerts
  router.put('/', requireDb, async (req, res) => {
    try {
      const { ReductionAlert } = getModels(req.conn);
      const { enabled, monitoredPaymentMethods, plansByMonth } = req.body;

      let config = await ReductionAlert.findOne();
      if (!config) {
        config = new ReductionAlert({
          enabled: Boolean(enabled),
          monitoredPaymentMethods: Array.isArray(monitoredPaymentMethods)
            ? monitoredPaymentMethods
            : [],
          plansByMonth: plansByMonth || {},
        });
      } else {
        if (typeof enabled === 'boolean') {
          config.enabled = enabled;
        }
        if (Array.isArray(monitoredPaymentMethods)) {
          config.monitoredPaymentMethods = monitoredPaymentMethods;
        }
        if (plansByMonth && typeof plansByMonth === 'object') {
          config.plansByMonth = plansByMonth;
          config.markModified('plansByMonth');
        }
      }

      const saved = await config.save();
      res.json({
        enabled: saved.enabled,
        monitoredPaymentMethods: saved.monitoredPaymentMethods,
        plansByMonth: saved.plansByMonth,
      });
    } catch (error) {
      console.error('Erro ao salvar alerta de redução:', error);
      res.status(500).json({ error: 'Erro ao salvar configurações de redução' });
    }
  });

  // POST /api/reduction-alerts (alias para salvar)
  router.post('/', requireDb, async (req, res) => {
    try {
      const { ReductionAlert } = getModels(req.conn);
      const { enabled, monitoredPaymentMethods, plansByMonth } = req.body;

      let config = await ReductionAlert.findOne();
      if (!config) {
        config = new ReductionAlert({
          enabled: Boolean(enabled),
          monitoredPaymentMethods: Array.isArray(monitoredPaymentMethods)
            ? monitoredPaymentMethods
            : [],
          plansByMonth: plansByMonth || {},
        });
      } else {
        if (typeof enabled === 'boolean') {
          config.enabled = enabled;
        }
        if (Array.isArray(monitoredPaymentMethods)) {
          config.monitoredPaymentMethods = monitoredPaymentMethods;
        }
        if (plansByMonth && typeof plansByMonth === 'object') {
          config.plansByMonth = plansByMonth;
          config.markModified('plansByMonth');
        }
      }

      const saved = await config.save();
      res.json({
        enabled: saved.enabled,
        monitoredPaymentMethods: saved.monitoredPaymentMethods,
        plansByMonth: saved.plansByMonth,
      });
    } catch (error) {
      console.error('Erro ao criar/atualizar alerta de redução:', error);
      res.status(500).json({ error: 'Erro ao salvar configurações de redução' });
    }
  });

  return router;
}
