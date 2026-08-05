import mongoose from 'mongoose';

import { RECURRENCE_TYPES, TRANSACTION_STATUS, TRANSACTION_TYPES } from '../constants.js';

// Schema de transações (mesmo schema usado por todos os bancos).
// Copiado do server.js original sem alteração, EXCETO:
//   - `category` e `paymentMethod` agora são ObjectId com ref para 'Category'
//     (coleção de categorias/meios de pagamento gerenciáveis). `required: false`
//     mantém documentos legados (que gravavam strings) válidos durante a
//     migração — o service resolve sempre uma categoria em gravações novas.
//   - os enums de type/recurrence/status vêm de constants.js.
export const transactionSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: TRANSACTION_TYPES, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: false },
  date: { type: Date, required: true },
  dueDate: { type: Date },
  isPaid: { type: Boolean, default: false },
  recurrence: { type: String, enum: RECURRENCE_TYPES, default: 'none' },
  paymentMethod: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: false },
  notes: { type: mongoose.Schema.Types.Mixed },
  savingsGoalId: { type: mongoose.Schema.Types.ObjectId, ref: 'SavingsGoal' },
  savingsGoalContributionId: { type: String }, // ID original da contribuição se migrado
  status: { type: String, enum: TRANSACTION_STATUS, default: 'active' },
  deletedAt: { type: Date }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });
