import mongoose from 'mongoose';

export const reductionAlertSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    monitoredPaymentMethods: { type: [String], default: [] },
    plansByMonth: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: 'reductioin_alerts',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
