import mongoose from 'mongoose';

// Schema de contribuições de meta (subdocumento) — copiado do server.js original.
export const savingsContributionSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  isPaid: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'deleted'], default: 'active' },
  deletedAt: { type: Date }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Schema de metas de poupança — copiado do server.js original.
export const savingsGoalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  targetAmount: { type: Number, required: true },
  currentAmount: { type: Number, default: 0 },
  deadline: { type: Date },
  contributions: [savingsContributionSchema],
  status: { type: String, enum: ['active', 'deleted'], default: 'active' },
  deletedAt: { type: Date }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });
