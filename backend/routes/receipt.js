import { Router } from 'express';

import { fetchReceiptData } from '../services/sefaz.js';

export function receiptRouter() {
  const router = Router();

  // Rota para buscar dados da nota fiscal (SEFAZ SP, PR, SC)
  router.get('/', async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL da nota fiscal é obrigatória' });
    }

    const result = await fetchReceiptData(url);
    res.json(result);
  });

  return router;
}
