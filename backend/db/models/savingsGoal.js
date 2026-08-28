import mongoose from 'mongoose';

import { SAVINGS_CONTRIBUTION_TYPES, SAVINGS_GOAL_STATUS } from '../constants.js';

// Schema de contribuições de meta (subdocumento)
export const savingsContributionSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: SAVINGS_CONTRIBUTION_TYPES, default: 'deposit' },
  isPaid: { type: Boolean, default: true },
  notes: { type: String },
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
  status: { type: String, enum: SAVINGS_GOAL_STATUS, default: 'active' },
  deletedAt: { type: Date },
  archivedAt: { type: Date }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });
