import mongoose from 'mongoose';

// Schema de inscrições Web Push — copiado do server.js original.
export const pushSubscriptionSchema = new mongoose.Schema({
  subscription: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now }
});
