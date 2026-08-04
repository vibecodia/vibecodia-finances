import { Router } from 'express';

export function healthRouter() {
  const router = Router();

  // Health Check - deve ser acessível sempre
  router.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Backend is healthy' });
  });

  return router;
}
