import mongoose from 'mongoose';

// Schema de itens da lista de compras — copiado do server.js original.
export const shoppingItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  purchased: { type: Boolean, default: false },
  isPriority: { type: Boolean, default: false },
  type: { type: String, enum: ['compras', 'afazeres'], default: 'compras' },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });
