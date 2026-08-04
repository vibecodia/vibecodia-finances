import webpush from 'web-push';

import { getModels } from '../db/models/index.js';
import { logger } from '../utils/logger.js';

// Dispara lembretes push de contas que vencem hoje (com agrupamento).
// Lógica copiada do server.js original sem alteração.
export const sendReminders = async (connectionManager, pin) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const conn = connectionManager.getConnection(pin);
    const { Transaction, PushSubscription } = getModels(conn);

    // Buscar contas que vencem hoje e não estão pagas
    const accountsDueToday = await Transaction.find({
      type: 'expense',
      isPaid: false,
      status: 'active',
      dueDate: { $gte: today, $lt: tomorrow }
    });

    if (accountsDueToday.length === 0) return;

    const subscriptions = await PushSubscription.find();
    if (subscriptions.length === 0) return;

    // Lógica de Agrupamento (Stacking)
    const notifications = [];
    if (accountsDueToday.length <= 3) {
      // Notificações individuais
      accountsDueToday.forEach(acc => {
        notifications.push({
          title: 'Conta a vencer hoje',
          body: `${acc.description}: R$ ${acc.amount.toFixed(2)}`,
          tag: acc._id.toString(), // ID da conta como tag
          data: { url: '/hoje' }
        });
      });
    } else {
      // Notificação agrupada
      notifications.push({
        title: 'Lembrete de Contas',
        body: `Você tem ${accountsDueToday.length} contas que vencem hoje.`,
        tag: 'contas-agrupadas', // Tag fixa para agrupamento
        data: { url: '/hoje' }
      });
    }

    // Disparar notificações
    for (const sub of subscriptions) {
      for (const note of notifications) {
        try {
          await webpush.sendNotification(sub.subscription, JSON.stringify(note));
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Inscrição expirada ou inválida
            await PushSubscription.deleteOne({ _id: sub._id });
          } else {
            logger.error(`Erro ao enviar push para PIN ${pin}:`, err);
          }
        }
      }
    }

    logger.info(`Push reminders [PIN ${pin}]: Enviadas ${notifications.length} notificações para ${subscriptions.length} dispositivos.`);
  } catch (error) {
    logger.error(`Push reminders erro [PIN ${pin}]:`, error);
  }
};

// Cron job que marca receitas vencidas como pagas automaticamente.
// Lógica copiada do server.js original sem alteração.
export const markIncomeAsPaid = async (connectionManager, pin) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const conn = connectionManager.getConnection(pin);
    const { Transaction } = getModels(conn);

    const result = await Transaction.updateMany(
      { type: 'income', isPaid: false, dueDate: { $lte: today } },
      { $set: { isPaid: true } }
    );
    logger.info(`Cron job [PIN ${pin}]: Marcou ${result.modifiedCount} transações como pagas.`);
  } catch (error) {
    logger.error(`Cron job erro [PIN ${pin}]:`, error);
  }
};
