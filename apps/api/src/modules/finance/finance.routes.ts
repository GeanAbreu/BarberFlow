import { Router, Request } from 'express';
import { Prisma } from '@prisma/client';
import { admin, auth, AuthedRequest, publicUser } from '../../core/auth';
import { prisma } from '../../core/database';
import { ApiError, wrap } from '../../core/errors';
import { rangeInput } from '../../core/schemas';

export const financeRouter = Router();

financeRouter.get('/earnings/me', auth, wrap(async (req: AuthedRequest, res) => {
  const { from, to } = rangeInput.parse(req.query);
  const rows = await prisma.appointment.findMany({ where: { barberId: req.session!.id, status: 'CONCLUIDO', date: { gte: new Date(from), lt: new Date(to) } }, include: { service: true, barber: { select: { commission: true } } } });
  const production = rows.reduce((sum, row) => sum + Number(row.priceAtBooking ?? row.service.price), 0);
  const commission = rows.reduce((sum, row) => sum + Number(row.priceAtBooking ?? row.service.price) * Number(row.commissionAtBooking ?? row.barber.commission) / 100, 0);
  return res.json({ count: rows.length, gross: production, commission });
}));

financeRouter.get('/finance', auth, admin, wrap(async (req, res) => {
  const { from, to } = rangeInput.parse(req.query);
  const where: Prisma.AppointmentWhereInput = { status: 'CONCLUIDO', date: { gte: new Date(from), lt: new Date(to) } };
  const rows = await prisma.appointment.findMany({ where, include: { barber: { select: publicUser }, service: true }, orderBy: { date: 'desc' } });
  const byBarber = new Map<string, { id: string; name: string; count: number; gross: number; commission: number }>();
  for (const row of rows) {
    const value = Number(row.priceAtBooking ?? row.service.price);
    const item = byBarber.get(row.barberId) || { id: row.barberId, name: row.barber.name, count: 0, gross: 0, commission: 0 };
    item.count++; item.gross += value; item.commission += value * Number(row.commissionAtBooking ?? row.barber.commission) / 100;
    byBarber.set(row.barberId, item);
  }
  const payments = await prisma.subscriptionPayment.findMany({ where: { status: 'PAGO', paidAt: { gte: new Date(from), lt: new Date(to) } }, include: { subscription: { include: { client: true, plan: true } } } });
  const serviceGross = rows.reduce((sum, row) => sum + (row.subscriptionId ? 0 : Number(row.priceAtBooking ?? row.service.price)), 0);
  const subscriptionGross = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const transactions = [
    ...rows.map(row => ({ id: row.id, date: row.date, barber: row.barber.name, service: row.subscriptionId ? `${row.service.name} · Assinatura` : row.service.name, price: row.subscriptionId ? 0 : Number(row.priceAtBooking ?? row.service.price), type: 'SERVICE' })),
    ...payments.map(payment => ({ id: payment.id, date: payment.paidAt!, barber: payment.subscription.client.name, service: `Assinatura · ${payment.subscription.plan.name}`, price: Number(payment.amount), type: 'SUBSCRIPTION' }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());
  return res.json({ count: rows.length, gross: serviceGross + subscriptionGross, serviceGross, subscriptionGross, byBarber: [...byBarber.values()], rows: transactions });
}));

const brDate = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const brMidnight = (day: string) => new Date(`${day}T00:00:00-03:00`);
const plusDays = (day: string, days: number) => new Date(new Date(`${day}T12:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10);
async function financialRows(from: Date, to: Date) {
  const [appointments, payments] = await Promise.all([
    prisma.appointment.findMany({ where: { status: 'CONCLUIDO', date: { gte: from, lt: to } }, include: { barber: { select: { id: true, name: true, commission: true } }, client: { select: { id: true, name: true } }, service: { select: { id: true, name: true, price: true } } }, orderBy: { date: 'desc' } }),
    prisma.subscriptionPayment.findMany({ where: { status: 'PAGO', paidAt: { gte: from, lt: to } }, include: { subscription: { include: { client: { select: { id: true, name: true } }, plan: { select: { name: true } } } } }, orderBy: { paidAt: 'desc' } })
  ]);
  const serviceGross = appointments.reduce((sum, row) => sum + (row.subscriptionId ? 0 : Number(row.priceAtBooking ?? row.service.price)), 0);
  const subscriptionGross = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  return { appointments, payments, serviceGross, subscriptionGross, gross: serviceGross + subscriptionGross };
}
function parseFinancialRange(query: Request['query']) {
  const { from, to } = rangeInput.parse(query);
  const start = new Date(from); const end = new Date(to);
  if (end.getTime() - start.getTime() > 366 * 86400000) throw new ApiError(400, 'O intervalo máximo é de 366 dias.');
  return { from: start, to: end };
}

financeRouter.get('/finance/dashboard', auth, admin, wrap(async (req, res) => {
  const selectedRange = parseFinancialRange(req.query);
  const currentDay = brDate(new Date());
  const monthStart = `${currentDay.slice(0, 7)}-01`;
  const nextMonth = new Date(`${monthStart}T12:00:00Z`); nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const weekStart = plusDays(currentDay, -((new Date(`${currentDay}T12:00:00Z`).getUTCDay() + 6) % 7));
  const [selected, day, week, month, serviceCounts, team] = await Promise.all([
    financialRows(selectedRange.from, selectedRange.to),
    financialRows(brMidnight(currentDay), brMidnight(plusDays(currentDay, 1))),
    financialRows(brMidnight(weekStart), brMidnight(plusDays(weekStart, 7))),
    financialRows(brMidnight(monthStart), brMidnight(nextMonth.toISOString().slice(0, 10))),
    prisma.appointment.groupBy({ by: ['serviceId'], where: { status: 'CONCLUIDO', date: { gte: selectedRange.from, lt: selectedRange.to } }, _count: { _all: true } }),
    prisma.user.findMany({ where: { role: 'BARBEIRO', active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
  ]);
  const clients = new Set([...selected.appointments.map(a => a.clientId), ...selected.payments.map(p => p.subscription.clientId)]);
  const barbers = new Map<string, { id: string; name: string; count: number; gross: number; commission: number }>();
  for (const member of team) barbers.set(member.id, { id: member.id, name: member.name, count: 0, gross: 0, commission: 0 });
  const serviceNames = new Map(selected.appointments.map(row => [row.serviceId, row.service.name]));
  for (const row of selected.appointments) {
    const value = Number(row.priceAtBooking ?? row.service.price);
    const barber = barbers.get(row.barberId) ?? { id: row.barberId, name: row.barber.name, count: 0, gross: 0, commission: 0 };
    barber.count++; barber.gross += value; barber.commission += value * Number(row.commissionAtBooking ?? row.barber.commission) / 100;
    barbers.set(row.barberId, barber);
  }
  const daily = new Map<string, number>();
  for (let dayName = monthStart; dayName < nextMonth.toISOString().slice(0, 10); dayName = plusDays(dayName, 1)) daily.set(dayName, 0);
  for (const row of month.appointments) if (!row.subscriptionId) { const key = brDate(row.date); daily.set(key, (daily.get(key) ?? 0) + Number(row.priceAtBooking ?? row.service.price)); }
  for (const payment of month.payments) { const key = brDate(payment.paidAt!); daily.set(key, (daily.get(key) ?? 0) + Number(payment.amount)); }
  return res.json({ cards: { day: day.gross, week: week.gross, month: month.gross, appointments: selected.appointments.length, clients: clients.size, averageTicket: clients.size ? selected.gross / clients.size : 0 }, selected: { gross: selected.gross, serviceGross: selected.serviceGross, subscriptionGross: selected.subscriptionGross, appointments: selected.appointments.length }, daily: [...daily].map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 })), services: serviceCounts.map(item => ({ id: item.serviceId, name: serviceNames.get(item.serviceId) ?? 'Serviço', count: item._count._all })).sort((a, b) => b.count - a.count), barbers: [...barbers.values()].sort((a, b) => b.gross - a.gross).map(b => ({ ...b, gross: Math.round(b.gross * 100) / 100, commission: Math.round(b.commission * 100) / 100 })) });
}));

financeRouter.get('/finance/export.csv', auth, admin, wrap(async (req, res) => {
  const { from, to } = parseFinancialRange(req.query);
  const report = await financialRows(from, to);
  const clean = (value: unknown) => { const raw = String(value ?? ''); const safe = /^[=+@-]/.test(raw) ? `'${raw}` : raw; return `"${safe.replace(/"/g, '""')}"`; };
  const lines = [['Data', 'Tipo', 'Cliente', 'Barbeiro', 'Serviço/Plano', 'Valor recebido (BRL)', 'Produção (BRL)', 'Comissão (BRL)'].map(clean).join(',')];
  for (const row of report.appointments) {
    const price = Number(row.priceAtBooking ?? row.service.price);
    lines.push([row.date.toISOString(), row.subscriptionId ? 'Atendimento assinatura' : 'Serviço', row.client.name, row.barber.name, row.service.name, row.subscriptionId ? 0 : price, price, (price * Number(row.commissionAtBooking ?? row.barber.commission) / 100).toFixed(2)].map(clean).join(','));
  }
  for (const payment of report.payments) lines.push([payment.paidAt!.toISOString(), 'Mensalidade', payment.subscription.client.name, '', payment.subscription.plan.name, Number(payment.amount), 0, 0].map(clean).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="barberflow-financeiro-${brDate(from)}-${brDate(to)}.csv"`);
  return res.send(`\uFEFF${lines.join('\r\n')}\r\n`);
}));
