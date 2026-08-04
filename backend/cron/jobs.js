import cron from 'node-cron';

import { markIncomeAsPaid, sendReminders } from '../services/notifications.js';

// Registra os cron jobs diários (mesmos horários e timezone do original).
export function registerCronJobs(connectionManager, pins) {
  // Executa cron job para cada PIN diariamente às 2h
  cron.schedule('0 2 * * *', () => {
    console.log('Rodando cron job diário (Pagar Receitas)...');
    pins.forEach(pin => markIncomeAsPaid(connectionManager, pin));
  }, { timezone: "America/Sao_Paulo" });

  // Executa cron job para lembretes de contas às 9h
  cron.schedule('0 9 * * *', () => {
    console.log('Rodando cron job diário (Lembretes Push)...');
    pins.forEach(pin => sendReminders(connectionManager, pin));
  }, { timezone: "America/Sao_Paulo" });
}
