import { AppointmentStatus, PaymentMethod, Prisma } from '@prisma/client';
import { prisma } from '../../core/database';
import { ApiError } from '../../core/errors';
import { periodOf } from '../../core/schemas';
import { publish } from '../../core/events';
import { appointmentsRepository } from './appointments.repository';

type CreateAppointment = { date: string; barberId: string; clientId: string; serviceId: string; subscriptionId?: string; paymentMethod?: PaymentMethod };

export class AppointmentsService {
  list(from: Date, to: Date, user: { id: string; role: string }) {
    const where: Prisma.AppointmentWhereInput = { date: { gte: from, lt: to }, ...(user.role === 'BARBEIRO' ? { barberId: user.id } : {}) };
    return appointmentsRepository.list(where);
  }

  async create(input: CreateAppointment) {
    const [service, barber, client] = await Promise.all([
      prisma.service.findFirst({ where: { id: input.serviceId, active: true } }),
      prisma.user.findFirst({ where: { id: input.barberId, role: 'BARBEIRO', active: true } }),
      prisma.client.findUnique({ where: { id: input.clientId } })
    ]);
    if (!service || !barber || !client) throw new ApiError(400, 'Cliente, serviço ou barbeiro indisponível.');
    const date = new Date(input.date); const end = new Date(date.getTime() + service.duration * 60000);
    const created = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.barberId}))`;
      const [existing, blocks] = await Promise.all([
        tx.appointment.findMany({ where: { barberId: input.barberId, status: { not: 'CANCELADO' }, date: { gte: new Date(date.getTime() - 480 * 60000), lt: end } }, include: { service: true } }),
        tx.scheduleBlock.findMany({ where: { barberId: input.barberId, start: { lt: end }, end: { gt: date } } })
      ]);
      if (blocks.length) throw new ApiError(409, `Profissional indisponível: ${blocks[0].reason}.`);
      if (existing.some(a => a.date < end && new Date(a.date.getTime() + a.service.duration * 60000) > date)) throw new ApiError(409, 'Esse horário conflita com outro agendamento.');
      if (input.subscriptionId) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.subscriptionId}))`;
        const subscription = await tx.clientSubscription.findUnique({ where: { id: input.subscriptionId }, include: { includedServices: { select: { id: true } }, payments: { where: { period: periodOf(date), status: 'PAGO' }, select: { id: true } } } });
        if (!subscription || subscription.status !== 'ATIVA' || subscription.clientId !== input.clientId || date < subscription.startDate) throw new ApiError(400, 'Assinatura inválida para este cliente ou data.');
        if (!subscription.includedServices.some(item => item.id === input.serviceId)) throw new ApiError(400, 'Serviço não incluído na assinatura.');
        if (!subscription.payments.length) throw new ApiError(409, 'Mensalidade do período ainda não foi paga.');
        const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)); const monthEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
        if (await tx.appointment.count({ where: { subscriptionId: subscription.id, status: { not: 'CANCELADO' }, date: { gte: monthStart, lt: monthEnd } } }) >= subscription.visitsPerMonth) throw new ApiError(409, 'Limite mensal de atendimentos atingido.');
      }
      const appointment = await tx.appointment.create({ data: { ...input, date, priceAtBooking: service.price, commissionAtBooking: barber.commission }, include: { barber: { select: { id: true, name: true } }, client: true, service: true } });
      if (client.phone) await tx.appointmentReminder.create({ data: { appointmentId: appointment.id, destination: client.phone, scheduledFor: new Date(Math.max(Date.now(), date.getTime() - 24 * 3600000)) } });
      return appointment;
    });
    publish('agenda.updated', { action: 'created', appointmentId: created.id }, input.barberId);
    return created;
  }

  async updateStatus(id: string, status: AppointmentStatus, user: { id: string; role: string }, paymentMethod?: PaymentMethod) {
    const current = await appointmentsRepository.find(id);
    if (!current) throw new ApiError(404, 'Agendamento não encontrado.');
    if (user.role === 'BARBEIRO' && current.barberId !== user.id) throw new ApiError(403, 'Acesso negado.');
    if (status === 'CONCLUIDO' && !current.subscriptionId && !(paymentMethod || current.paymentMethod)) throw new ApiError(400, 'Informe a forma de pagamento para concluir.');
    const updated = await prisma.appointment.update({ where: { id }, data: { status, ...(paymentMethod ? { paymentMethod } : {}) } });
    publish('agenda.updated', { action: 'status', appointmentId: id, status }, current.barberId);
    return updated;
  }
}

export const appointmentsService = new AppointmentsService();
