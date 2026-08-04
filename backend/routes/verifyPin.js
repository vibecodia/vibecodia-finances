import { Router } from 'express';

export function verifyPinRouter({ vapidPublicKey, hasPin }) {
  const router = Router();

  router.post('/', (req, res) => {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, message: 'PIN não fornecido.' });
    }

    if (hasPin(pin)) {
      res.json({ success: true, vapidPublicKey: vapidPublicKey });
    } else {
      res.status(401).json({ success: false, message: 'PIN inválido.' });
    }
  });

  return router;
}
