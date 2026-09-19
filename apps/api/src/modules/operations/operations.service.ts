import { PaymentMethod, Prisma } from '@prisma/client';
import { prisma } from '../../core/database';
import { ApiError } from '../../core/errors';
import { publish } from '../../core/events';
import { operationsRepository } from './operations.repository';
import { reminderProvider } from './whatsapp.provider';

export class OperationsService {
  async summary(from: Date, to: Date) {
    const [appointments, payments, expenses, closings] = await Promise.all([
      prisma.appointment.findMany({ where: { status: 'CONCLUIDO', date: { gte: from, lt: to } }, include: { service: true } }),
      prisma.subscriptionPayment.findMany({ where: { status: 'PAGO', paidAt: { gte: from, lt: to } } }),
      operationsRepository.expenses(from, to),
      prisma.cashClosing.findMany({ where: { closedAt: { gte: from, lt: to } }, include: { closedBy: { select: { name: true } } }, orderBy: { businessDate: 'desc' } })
    ]);
    const revenues = new Map<string, number>();
    for (const row of appointments) if (!row.subscriptionId) revenues.set(row.paymentMethod || 'OUTRO', (revenues.get(row.paymentMethod || 'OUTRO') || 0) + Number(row.priceAtBooking ?? row.service.price));
    for (const row of payments) revenues.set(row.paymentMethod || 'OUTRO', (revenues.get(row.paymentMethod || 'OUTRO') || 0) + Number(row.amount));
    const revenue = [...revenues.values()].reduce((a,b) => a+b, 0); const expenseTotal = expenses.reduce((sum,row) => sum+Number(row.amount),0);
    return { revenue, expenseTotal, balance: revenue-expenseTotal, byPaymentMethod: [...revenues].map(([method,total])=>({method,total})), expenses, closings };
  }
  addExpense(input: { description: string; category: string; amount: number; date: string; paymentMethod: PaymentMethod }, userId: string) { return operationsRepository.createExpense({ ...input, amount: new Prisma.Decimal(input.amount), date: new Date(input.date), createdById: userId }); }
  async closeCash(input: { businessDate: string; openingAmount: number; actualAmount: number; notes?: string }, userId: string) {
    const from = new Date(`${input.businessDate}T00:00:00-03:00`); const to = new Date(from); to.setDate(to.getDate()+1); const summary = await this.summary(from,to);
    const expected = input.openingAmount + summary.revenue - summary.expenseTotal; const difference = input.actualAmount-expected;
    return prisma.cashClosing.create({ data: { businessDate: input.businessDate, openingAmount: input.openingAmount, actualAmount: input.actualAmount, expectedAmount: expected, difference, revenue: summary.revenue, expenses: summary.expenseTotal, notes: input.notes, closedById: userId } });
  }
  async addBlock(input: { barberId: string; start: string; end: string; reason: string }) {
    const start = new Date(input.start); const end = new Date(input.end); if (end <= start) throw new ApiError(400,'Fim do bloqueio deve ser após o início.');
    const block = await operationsRepository.createBlock({ ...input, start, end }); publish('agenda.updated',{action:'block',blockId:block.id},input.barberId); return block;
  }
  async clientHistory(id: string) {
    const client = await operationsRepository.clientHistory(id);
    if (!client) throw new ApiError(404, 'Cliente não encontrado.');
    return client;
  }
  async processReminders() {
    const reminders = await operationsRepository.reminders(); let sent=0, skipped=0, failed=0;
    for (const reminder of reminders) {
      const date = reminder.appointment.date.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}); const message = `Olá, ${reminder.appointment.client.name}! Lembrete do seu ${reminder.appointment.service.name} com ${reminder.appointment.barber.name} em ${date}. BarberFlow.`;
      try { const result=await reminderProvider.send(reminder.destination,message); await prisma.appointmentReminder.update({where:{id:reminder.id},data:result.skipped?{status:'IGNORADO',error:'Provedor WhatsApp não configurado.'}:{status:'ENVIADO',sentAt:new Date(),providerId:result.providerId}}); result.skipped?skipped++:sent++; }
      catch(error){failed++;await prisma.appointmentReminder.update({where:{id:reminder.id},data:{status:'FALHOU',error:(error as Error).message.slice(0,500)}});}
    }
    return {processed:reminders.length,sent,skipped,failed};
  }
}

export const operationsService = new OperationsService();
