import mongoose from 'mongoose';

import { CATEGORY_STATUS, CATEGORY_TYPES } from '../constants.js';

// Schema de categorias (despesas, receitas e meios de pagamento).
// Substitui as listas hardcoded do frontend (EXPENSE_CATEGORIES,
// INCOME_CATEGORIES, PAYMENT_METHODS) por dados gerenciáveis no banco.
//
// As flags booleanas substituem TODOS os checks por string que existiam no
// código ("Aporte", "Rendimentos", "Flash"/"Vero Card"):
//   - isSavingsContribution: era `category === "Aporte"`
//   - isPassiveIncome:       era `category === "Rendimentos"`
//   - isBenefit:             era `paymentMethod === "Flash" || "Vero Card"`
//   - isSystem:              categorias built-in que não podem ser removidas
export const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },                          // "Alimentação", "Bradesco R"
  code: { type: String, required: true, unique: true },            // slug estável: "alimentacao", "bradesco_r"
  type: { type: String, enum: CATEGORY_TYPES, required: true },    // expense | income | payment_method

  isSavingsContribution: { type: Boolean, default: false },
  isPassiveIncome: { type: Boolean, default: false },
  isBenefit: { type: Boolean, default: false },
  // Para cartões de benefício: se o saldo líquido do cartão participa da
  // subtração quando o mestre global "incluir benefícios" está desligado.
  includeInBalance: { type: Boolean, default: true },
  isSystem: { type: Boolean, default: false },

  emoji: { type: String, default: '' },
  color: { type: String, default: '#6366f1' },
  descriptionTemplate: { type: String, default: '' },              // ex: "Aporte: ${goal.name}"
  descriptionSuggestions: { type: [String], default: [] },         // ex: sugestões de "Rendimentos"

  order: { type: Number, default: 0 },
  status: { type: String, enum: CATEGORY_STATUS, default: 'active' },
  deletedAt: { type: Date }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });
