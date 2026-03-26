import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ---------- Conexão dinâmica com MongoDB por PIN ----------

// Parse do JSON map do .env
let DB_CONN_MAP = {};
try {
  DB_CONN_MAP = JSON.parse(process.env.MONGO_CONN_MAP || '{}');
} catch (err) {
  console.error("Erro ao parsear MONGO_CONN_MAP:", err);
  process.exit(1);
}

// Cache de conexões
const connections = {};

// Função para pegar conexão do banco com base no PIN
function getDbConnection(pin) {
  const uri = DB_CONN_MAP[pin];
  if (!uri) throw new Error(`PIN inválido ou banco não configurado: ${pin}`);

  if (!connections[pin]) {
    connections[pin] = mongoose.createConnection(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });

    connections[pin].on('connected', () => {
      console.log(`MongoDB conectado para PIN ${pin}`);
    });

    connections[pin].on('error', (err) => {
      console.error(`Erro na conexão do banco (${pin}):`, err);
    });
  }

  return connections[pin];
}


// ---------- Helper ----------

const createLocalDateForStorage = (dateString) => {
  if (!dateString) return undefined;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0); // Noon local time
};

// ---------- Schemas (mesmos para todos os bancos) ----------

const savingsContributionSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['active', 'deleted'], default: 'active' },
  deletedAt: { type: Date }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

const transactionSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  category: { type: String, required: true },
  date: { type: Date, required: true },
  dueDate: { type: Date },
  isPaid: { type: Boolean, default: false },
  recurrence: { type: String, enum: ['none', 'weekly', 'monthly', 'yearly'], default: 'none' },
  paymentMethod: { 
    type: String, 
    default: 'PIX' 
  },
  notes: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['active', 'deleted'], default: 'active' },
  deletedAt: { type: Date }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

const savingsGoalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  targetAmount: { type: Number, required: true },
  currentAmount: { type: Number, default: 0 },
  deadline: { type: Date },
  contributions: [savingsContributionSchema]
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

const shoppingItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  purchased: { type: Boolean, default: false },
  isPriority: { type: Boolean, default: false },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// ---------- Cron Job ----------

const markIncomeAsPaid = async (pin) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const conn = getDbConnection(pin);
    const Transaction = conn.model('Transaction', transactionSchema);

    const result = await Transaction.updateMany(
      { type: 'income', isPaid: false, dueDate: { $lte: today } },
      { $set: { isPaid: true } }
    );
    console.log(`Cron job [PIN ${pin}]: Marcou ${result.modifiedCount} transações como pagas.`);
  } catch (error) {
    console.error(`Cron job erro [PIN ${pin}]:`, error);
  }
};

// Executa cron job para cada PIN diariamente às 2h
cron.schedule('0 2 * * *', () => {
  console.log('Rodando cron job diário...');
  Object.keys(DB_CONN_MAP).forEach(pin => markIncomeAsPaid(pin));
}, { timezone: "America/Sao_Paulo" });

// ---------- Rotas API ----------

app.post('/api/verify-pin', (req, res) => {
  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ success: false, message: 'PIN não fornecido.' });
  }

  if (Object.prototype.hasOwnProperty.call(DB_CONN_MAP, pin)) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'PIN inválido.' });
  }
});

// Middleware para pegar conexão pelo PIN passado no header ou query
const dbMiddleware = (req, res, next) => {
  const pin = req.header('x-pin') || req.query.pin;
  if (!pin) return res.status(400).json({ error: 'PIN obrigatório no header ou query' });
  try {
    req.conn = getDbConnection(pin);
    next();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

////////////
app.get('/api/admin/migrate-status', dbMiddleware, async (req, res) => {
  const Transaction = req.conn.model('Transaction', transactionSchema);
  // Se tiver o SavingsGoal, importe o schema dele também
  // const SavingsGoal = req.conn.model('SavingsGoal', savingsGoalSchema);

  try {
    // Atualiza Transactions
    const resT = await Transaction.updateMany(
      { status: { $exists: false } }, 
      { $set: { status: 'active', deletedAt: null } }
    );

    // Se tiver SavingsGoal, descomente abaixo:
    // const resS = await SavingsGoal.updateMany(
    //   { status: { $exists: false } }, 
    //   { $set: { status: 'active', deletedAt: null } }
    // );

    res.json({
      message: 'Migração concluída com sucesso!',
      transactionsUpdated: resT.modifiedCount,
      // goalsUpdated: resS.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Transações
app.get('/api/transactions', dbMiddleware, async (req, res) => {
  const { search, type } = req.query;
  const Transaction = req.conn.model('Transaction', transactionSchema);

  let query = {};

  if (type) query.type = type;
  if (search) query.description = { $regex: search, $options: 'i' };
  try {
    const transactions = await Transaction.find(query);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/transactions', dbMiddleware, async (req, res) => {
  const Transaction = req.conn.model('Transaction', transactionSchema);
  const transactionData = {
    ...req.body,
    paymentMethod: req.body.paymentMethod || 'pix',
    date: createLocalDateForStorage(req.body.date),
    dueDate: req.body.dueDate ? createLocalDateForStorage(req.body.dueDate) : undefined,
  };

  try {
    const newTransaction = await new Transaction(transactionData).save();
    res.status(201).json(newTransaction);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/transactions/:id', dbMiddleware, async (req, res) => {
  const Transaction = req.conn.model('Transaction', transactionSchema);
  try {
    const updateData = {
      ...req.body,
    };
    
    if (req.body.date) {
      updateData.date = createLocalDateForStorage(req.body.date);
    }
    if (req.body.dueDate !== undefined) {
      updateData.dueDate = req.body.dueDate ? createLocalDateForStorage(req.body.dueDate) : undefined;
    }
    
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!updatedTransaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.json(updatedTransaction);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/transactions/:id', dbMiddleware, async (req, res) => {
  const Transaction = req.conn.model('Transaction', transactionSchema);
  try {
    const deletedTransaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { status: 'deleted', deletedAt: new Date() },
      { new: true }
    );
    if (!deletedTransaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------- Metas de Poupança ----------
app.get('/api/goals', dbMiddleware, async (req, res) => {
  const SavingsGoal = req.conn.model('SavingsGoal', savingsGoalSchema);
  try {
    const goals = await SavingsGoal.find();
    // Filtra contribuições ativas para cada meta
    const filteredGoals = goals.map(goal => {
      const goalObj = goal.toObject();
      goalObj.contributions = (goalObj.contributions || []).filter(c => c.status === 'active');
      // Garante que currentAmount reflita apenas as ativas (segurança extra)
      goalObj.currentAmount = goalObj.contributions.reduce((sum, c) => sum + (c.amount || 0), 0);
      return goalObj;
    });
    res.json(filteredGoals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/goals', dbMiddleware, async (req, res) => {
  const SavingsGoal = req.conn.model('SavingsGoal', savingsGoalSchema);
  const goalData = {
    ...req.body,
    deadline: req.body.deadline ? createLocalDateForStorage(req.body.deadline) : undefined,
  };
  const goal = new SavingsGoal(goalData);
  try {
    const newGoal = await goal.save();
    res.status(201).json(newGoal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/goals/:id', dbMiddleware, async (req, res) => {
  const SavingsGoal = req.conn.model('SavingsGoal', savingsGoalSchema);
  try {
    const updateData = {
      ...req.body,
      deadline: req.body.deadline ? createLocalDateForStorage(req.body.deadline) : undefined,
    };
    const updatedGoal = await SavingsGoal.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );
    if (!updatedGoal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    res.json(updatedGoal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/goals/:id', dbMiddleware, async (req, res) => {
  const SavingsGoal = req.conn.model('SavingsGoal', savingsGoalSchema);
  try {
    const deletedGoal = await SavingsGoal.findByIdAndDelete(req.params.id);
    if (!deletedGoal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    res.json({ message: 'Savings goal deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/goals/:id/contributions', dbMiddleware, async (req, res) => {
  const SavingsGoal = req.conn.model('SavingsGoal', savingsGoalSchema);
  try {
    const goal = await SavingsGoal.findById(req.params.id);
    if (!goal) {
      return res.status(404).json({ message: 'Savings goal not found' });
    }

    const { amount, date } = req.body;
    const contribution = {
      amount,
      date: date ? createLocalDateForStorage(date) : new Date(),
      status: 'active'
    };

    goal.contributions.push(contribution);
    
    // Recalcular currentAmount considerando apenas contribuições ativas
    goal.currentAmount = goal.contributions
      .filter(c => c.status !== 'deleted')
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    const updatedGoal = await goal.save();
    res.status(201).json(updatedGoal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/goals/:goalId/contributions/:contributionId', dbMiddleware, async (req, res) => {
  const SavingsGoal = req.conn.model('SavingsGoal', savingsGoalSchema);
  try {
    const goal = await SavingsGoal.findById(req.params.goalId);
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    const contribution = goal.contributions.id(req.params.contributionId);
    if (!contribution || contribution.status === 'deleted') {
      return res.status(404).json({ message: 'Contribution not found' });
    }

    const newAmount = req.body.amount;

    contribution.amount = newAmount;
    contribution.date = req.body.date;

    // Recalcular currentAmount considerando apenas contribuições ativas
    goal.currentAmount = goal.contributions
      .filter(c => c.status !== 'deleted')
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    await goal.save();
    res.json(goal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/goals/:goalId/contributions/:contributionId', dbMiddleware, async (req, res) => {
  const SavingsGoal = req.conn.model('SavingsGoal', savingsGoalSchema);
  try {
    const goal = await SavingsGoal.findById(req.params.goalId);
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    const contribution = goal.contributions.id(req.params.contributionId);
    if (!contribution || contribution.status === 'deleted') {
      return res.status(404).json({ message: 'Contribution not found' });
    }

    // Soft delete
    contribution.status = 'deleted';
    contribution.deletedAt = new Date();

    // Recalcular currentAmount considerando apenas contribuições ativas
    goal.currentAmount = goal.contributions
      .filter(c => c.status !== 'deleted')
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    await goal.save();
    res.json(goal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



// ---------- Lista de Compras ----------
app.get('/api/shopping-list', dbMiddleware, async (req, res) => {
  const ShoppingItem = req.conn.model('ShoppingItem', shoppingItemSchema);
  try {
    const items = await ShoppingItem.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/shopping-list', dbMiddleware, async (req, res) => {
  const ShoppingItem = req.conn.model('ShoppingItem', shoppingItemSchema);
  const item = new ShoppingItem({
    name: req.body.name,
    isPriority: req.body.isPriority || false,
  });
  try {
    const newItem = await item.save();
    res.status(201).json(newItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/shopping-list/:id', dbMiddleware, async (req, res) => {
  const ShoppingItem = req.conn.model('ShoppingItem', shoppingItemSchema);
  try {
    const updatedItem = await ShoppingItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedItem) {
      return res.status(404).json({ message: 'Shopping item not found' });
    }
    res.json(updatedItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/shopping-list/purchased', dbMiddleware, async (req, res) => {
  const ShoppingItem = req.conn.model('ShoppingItem', shoppingItemSchema);
  try {
    await ShoppingItem.deleteMany({ purchased: true });
    res.json({ message: 'Purchased items cleared' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to clear purchased items: ' + err.message });
  }
});

app.delete('/api/shopping-list/:id', dbMiddleware, async (req, res) => {
  const ShoppingItem = req.conn.model('ShoppingItem', shoppingItemSchema);
  try {
    const deletedItem = await ShoppingItem.findByIdAndDelete(req.params.id);
    if (!deletedItem) {
      return res.status(404).json({ message: 'Shopping item not found' });
    }
    res.json({ message: 'Shopping item deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Rota para buscar dados da nota fiscal (SEFAZ SP, PR, SC)
app.get('/api/fetch-receipt-data', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL da nota fiscal é obrigatória' });
  }

  // Sanitizar URL: o pipe "|" às vezes vem codificado ou causa problemas em certos ambientes
  let sanitizedUrl = url.toString().replace(/%7C/g, '|');

  // Mapear URLs curtas de SP para a URL completa de consulta, conforme sugerido
  if (sanitizedUrl.includes('nfce.fazenda.sp.gov.br/qrcode')) {
    sanitizedUrl = sanitizedUrl.replace('/qrcode', '/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx');
  }

  try {
    // Configurar timeout e headers para evitar bloqueios básicos
    const response = await axios.get(sanitizedUrl, {
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: false,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (response.status !== 200) {
      console.warn(`⚠️ SEFAZ respondeu com status ${response.status}`);
    }

    const html = response.data;
    
    // Função auxiliar para limpar HTML tags e entidades
    const cleanText = (text) => {
      if (!text) return '';
      return text.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    };

    let storeName = 'Estabelecimento Desconhecido';
    let totalAmount = 0;
    let date = new Date().toISOString().split('T')[0];
    let itemsList = [];

    // --- LÓGICA DE PARSING REFORÇADA ---

    // 1. Nome do Estabelecimento (Busca por txtTopo ou id u20)
    const storeMatch = html.match(/class="txtTopo"[^>]*>([\s\S]*?)<\/div>/i) || 
                       html.match(/id="u20"[^>]*>([\s\S]*?)<\/div>/i);
    if (storeMatch) {
      storeName = cleanText(storeMatch[1]);
    }

    // 2. Valor Total (Busca pela classe txtMax ou rótulo Valor a Pagar)
    const amountMatch = html.match(/txtMax[^>]*>([\s\S]*?)<\/span>/i) ||
                        html.match(/Valor a pagar[\s\S]*?totalNumb[^>]*>([\s\S]*?)<\/span>/i) ||
                        html.match(/Valor total[\s\S]*?totalNumb[^>]*>([\s\S]*?)<\/span>/i);
    
    if (amountMatch) {
      const rawValue = cleanText(amountMatch[1]);
      totalAmount = parseFloat(rawValue.replace(/\./g, '').replace(',', '.')) || 0;
    }

    // 3. Data da Emissão
    const dateMatch = html.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (dateMatch) {
      const [day, month, year] = dateMatch[1].split('/');
      date = `${year}-${month}-${day}`;
    }

    // 4. Itens da Nota (Regex focado na classe txtTit e valor)
    // Tenta capturar o bloco de cada item
    const itemRegex = /<span class="txtTit">([\s\S]*?)<\/span>[\s\S]*?Qtde\.:<\/strong>([\s\S]*?)<\/span>[\s\S]*?class="valor">([\s\S]*?)<\/span>/gis;
    let match;
    while ((match = itemRegex.exec(html)) !== null) {
      const name = cleanText(match[1]);
      const qty = parseFloat(cleanText(match[2]).replace(',', '.')) || 1;
      const price = parseFloat(cleanText(match[3]).replace(/\./g, '').replace(',', '.')) || 0;
      
      itemsList.push({
        description: name,
        qty: qty,
        unitPrice: price,
        totalItemPrice: (qty * price)
      });
    }

    // 4.1 Extrair Descontos (se houver)
    const discountMatch = html.match(/Descontos R\$:[\s\S]*?totalNumb[^>]*>([\s\S]*?)<\/span>/i);
    if (discountMatch) {
      const discountVal = parseFloat(cleanText(discountMatch[1]).replace(/\./g, '').replace(',', '.')) || 0;
      if (discountVal > 0) {
        itemsList.push({
          description: "(-) DESCONTOS TOTAIS",
          qty: 1,
          unitPrice: -discountVal,
          totalItemPrice: -discountVal
        });
      }
    }

    // Fallback para itens se o primeiro falhar
    if (itemsList.length === 0) {
      const fallbackRegex = /class="txtNome">([\s\S]*?)<\/span>[\s\S]*?class="valor">([\s\S]*?)<\/span>/gis;
      while ((match = fallbackRegex.exec(html)) !== null) {
        const name = cleanText(match[1]);
        const price = parseFloat(cleanText(match[2]).replace(/\./g, '').replace(',', '.')) || 0;
        itemsList.push({ description: name, qty: 1, unitPrice: price, totalItemPrice: price });
      }
    }

    // 5. Categorização
    let category = 'Outros';
    const storeUpper = storeName.toUpperCase();
    if (storeUpper.match(/MERCADO|SUPERMERCADO|ATACAREJO|REDE MARIAS|PAO DE ACUCAR|CARREFOUR|ASSAI|ZAFFARI|CONFIANCA|DALBEN|CONFIANÇA/)) {
      category = 'Mercado';
    } else if (storeUpper.match(/POSTO|SHELL|IPIRANGA|BR|PETROBRAS|COMBUSTIVEL/)) {
      category = 'Transporte';
    } else if (storeUpper.match(/FARMACIA|DROGARIA|RAIA|DROGASIL|SAO PAULO|PANVEL/)) {
      category = 'Saúde';
    } else if (storeUpper.match(/RESTAURANTE|LANCHONETE|IFOOD|BURGER KING|MC DONALDS|PIZZA|CAFE/)) {
      category = 'Alimentação';
    } else if (storeUpper.match(/PET|VETERINARIA|COBASI|PETZ/)) {
      category = 'Pets';
    }

    const notes = itemsList.length > 0 
      ? { version: "1.0", source: "SEFAZ", store: storeName, items: itemsList }
      : 'Dados detalhados dos itens não disponíveis.';

    res.json({
      success: true,
      data: { description: storeName, amount: totalAmount, date: date, category: category, notes: notes, type: 'expense' }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar dados da SEFAZ:', error.message);
    res.status(500).json({ 
      error: 'Não foi possível ler os dados da SEFAZ diretamente. Verifique a conexão ou o link.',
      details: error.message 
    });
  }
});

// ---------- FIM DAS ROTAS DE API ----------

// ---------- IMPORTANTE: Rotas de API devem vir ANTES dos arquivos estáticos ----------

// Health Check - deve ser acessível sempre
app.get('/api/health-check', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is healthy' });
});

// ---------- Serve static files (SEMPRE POR ÚLTIMO - CATCH-ALL) ----------
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all handler - SEMPRE DEVE SER A ÚLTIMA ROTA
app.use((req, res) => {
  console.log('🎯 Catch-all handler acionado para:', req.url);
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});