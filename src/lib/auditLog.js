import { base44 } from '@/api/base44Client';

export async function logAction({ action, description, operator, fightNumber, ticketNumber, amount, metadata, severity = 'info' }) {
  try {
    await base44.entities.AuditLog.create({
      action,
      description,
      operator_id: operator?.id || '',
      operator_name: operator?.name || '',
      terminal_id: operator?.terminal_id || '',
      fight_number: fightNumber,
      ticket_number: ticketNumber,
      amount,
      metadata: metadata ? JSON.stringify(metadata) : '',
      severity,
    });
  } catch (e) {
    // non-blocking
  }
}