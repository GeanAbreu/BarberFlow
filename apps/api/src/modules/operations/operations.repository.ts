import { Prisma } from '@prisma/client';
import { prisma } from '../../core/database';

export class OperationsRepository {
  expenses(from: Date, to: Date) { return prisma.expense.findMany({ where: { date: { gte: from, lt: to } }, include: { createdBy: { select: { name: true } } }, orderBy: { date: 'desc' } }); }
  createExpense(data: Prisma.ExpenseUncheckedCreateInput) { return prisma.expense.create({ data }); }
  blocks(from: Date, to: Date, barberId?: string) { return prisma.scheduleBlock.findMany({ where: { start: { lt: to }, end: { gt: from }, ...(barberId ? { barberId } : {}) }, include: { barber: { select: { id: true, name: true } } }, orderBy: { start: 'asc' } }); }
  createBlock(data: Prisma.ScheduleBlockUncheckedCreateInput) { return prisma.scheduleBlock.create({ data, include: { barber: { select: { id: true, name: true } } } }); }
  deleteBlock(id: string) { return prisma.scheduleBlock.delete({ where: { id } }); }
  clientHistory(id: string) { return prisma.client.findUnique({ where: { id }, include: { appointments: { include: { service: true, barber: { select: { name: true } } }, orderBy: { date: 'desc' } }, subscriptions: { include: { plan: true, payments: { orderBy: { dueDate: 'desc' } } } } } }); }
  reminders() { return prisma.appointmentReminder.findMany({ where: { status: 'PENDENTE', scheduledFor: { lte: new Date() } }, include: { appointment: { include: { client: true, barber: { select: { name: true } }, service: { select: { name: true } } } } }, take: 50, orderBy: { scheduledFor: 'asc' } }); }
}

export const operationsRepository = new OperationsRepository();
