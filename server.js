import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import cron from 'node-cron';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Configuração do Multer para upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 5000 * 5000 }, // Limite de 50MB
 });

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
  notes: { type: String, trim: true }
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
      date: createLocalDateForStorage(req.body.date),
      dueDate: req.body.dueDate ? createLocalDateForStorage(req.body.dueDate) : undefined,
    };
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
    const deletedTransaction = await Transaction.findByIdAndDelete(req.params.id);
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
    res.json(goals);
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
    };

    goal.contributions.push(contribution);
    goal.currentAmount += amount;

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
    if (!contribution) {
      return res.status(404).json({ message: 'Contribution not found' });
    }

    const oldAmount = contribution.amount;
    const newAmount = req.body.amount;

    contribution.amount = newAmount;
    contribution.date = req.body.date;

    goal.currentAmount = goal.currentAmount - oldAmount + newAmount;

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
    if (!contribution) {
      return res.status(404).json({ message: 'Contribution not found' });
    }

    goal.currentAmount -= contribution.amount;
    goal.contributions.pull(req.params.contributionId);

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

// ---------- FIM DAS ROTAS DE API ----------

// ---------- IMPORTANTE: Rotas de API devem vir ANTES dos arquivos estáticos ----------

// Health Check - deve ser acessível sempre
app.get('/api/health-check', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is healthy' });
});

// Rota para upload de imagens (CRÍTICO: DEVE VIR ANTES DE QUALQUER ARQUIVO ESTÁTICO)
app.post('/api/upload', upload.single('image'), (req, res) => {
  console.log('📤 Rota /api/upload acessada!');
  console.log('Arquivo:', req.file);
  console.log('Body:', req.body);
  
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }
  
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ 
    success: true, 
    imageUrl,
    message: 'Imagem salva com sucesso'
  });
});

// Servir arquivos estáticos da pasta uploads (antes do dist)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------- Serve static files (SEMPRE POR ÚLTIMO - CATCH-ALL) ----------
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all handler - SEMPRE DEVE SER A ÚLTIMA ROTA
app.use((req, res) => {
  console.log('🎯 Catch-all handler acionado para:', req.url);
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  // Criar pasta uploads se não existir
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
});
