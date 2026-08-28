import https from 'https';

import axios from 'axios';
import { Router } from 'express';

// AI Proxy Route to bypass CORS. Mantém o tratamento de erro customizado
// (forward do status da API externa) por ser pass-through.
export function aiProxyRouter() {
  const router = Router();

  router.post('/', async (req, res) => {
    console.log('🤖 Recebida requisição para AI Proxy...');
    try {
      const { persona, message, max_tokens } = req.body;

      console.log('📡 Enviando para Vibecodia API:', { persona, messageLength: message?.length });

      const response = await axios.post('https://api.vibecodia.com.br/chat', {
        persona: persona || "finances",
        message: message,
        max_tokens: max_tokens || null
      }, {
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 60000,
        httpsAgent: new https.Agent({ rejectUnauthorized: false }) // Ignora erro de certificado expirado
      });

      console.log('✅ Resposta da IA recebida com sucesso.');
      res.json(response.data);
    } catch (error) {
      console.error('❌ ERRO DETALHADO NO AI PROXY:');
      if (error.response) {
        // A API respondeu com um código de erro (4xx, 5xx)
        console.error('Status:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data));
        res.status(error.response.status).json(error.response.data);
      } else if (error.request) {
        // A requisição foi feita mas não houve resposta
        console.error('Nenhuma resposta recebida do servidor da Vibecodia (Timeout/Rede)');
        res.status(504).json({ error: 'Timeout ou erro de rede na API externa' });
      } else {
        // Erro ao configurar a requisição
        console.error('Erro de configuração:', error.message);
        res.status(500).json({ error: error.message });
      }
    }
  });

  return router;
}
