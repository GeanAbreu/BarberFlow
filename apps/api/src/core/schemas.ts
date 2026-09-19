import { AppointmentStatus } from '@prisma/client';
import { z } from 'zod';

export const rangeInput = z.object({ from: z.string().datetime({ offset: true }), to: z.string().datetime({ offset: true }) }).refine(v => new Date(v.to) > new Date(v.from));
export const appointmentInput = z.object({ date: z.string().datetime({ offset: true }), barberId: z.string().uuid(), clientId: z.string().uuid(), serviceId: z.string().uuid(), subscriptionId: z.string().uuid().optional(), paymentMethod: z.enum(['DINHEIRO','PIX','CARTAO_CREDITO','CARTAO_DEBITO','OUTRO']).optional() });
export const statusInput = z.object({ status: z.nativeEnum(AppointmentStatus), paymentMethod: z.enum(['DINHEIRO','PIX','CARTAO_CREDITO','CARTAO_DEBITO','OUTRO']).optional() });
export const periodOf = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
