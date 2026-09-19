import { Prisma } from '@prisma/client';
import { prisma } from '../../core/database';
import { publicUser } from '../../core/auth';

export class AppointmentsRepository {
  list(where: Prisma.AppointmentWhereInput) { return prisma.appointment.findMany({ where, include: { barber: { select: publicUser }, client: true, service: true }, orderBy: { date: 'asc' } }); }
  find(id: string) { return prisma.appointment.findUnique({ where: { id } }); }
}

export const appointmentsRepository = new AppointmentsRepository();
