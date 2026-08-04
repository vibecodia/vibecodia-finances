import mongoose from 'mongoose';

// Schema de transações (mesmo schema usado por todos os bancos).
// Copiado do server.js original sem alteração.
export const transactionSchema = new mongoose.Schema({
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
  savingsGoalId: { type: mongoose.Schema.Types.ObjectId, ref: 'SavingsGoal' },
  savingsGoalContributionId: { type: String }, // ID original da contribuição se migrado
  status: { type: String, enum: ['active', 'deleted'], default: 'active' },
  deletedAt: { type: Date }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });
