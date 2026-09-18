import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppointmentStatus, Prisma, PrismaClient, Role, SubscriptionStatus } from '@prisma/client';
import { z, ZodError } from 'zod';

const prisma = new PrismaClient();
const app = express();
class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres.');
const origin = process.env.WEB_ORIGIN || 'http://localhost:3000';
app.use(helmet());
app.use(cors({ origin, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.headers.origin && req.headers.origin !== origin) return res.status(403).json({ error: 'Origem não permitida.' });
  next();
});

type Session = { id: string; role: Role };
type AuthedRequest = Request & { session?: Session };
const wrap = (fn: (req: AuthedRequest, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req as AuthedRequest, res)).catch(next);
async function auth(req: AuthedRequest, res: Response, next: NextFunction) {
  const cookie = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith('bf_session='))?.slice(11);
  try {
    const payload = jwt.verify(cookie || '', secret!) as Session;
    const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { id: true, role: true, active: true } });
    if (!user?.active) return res.status(401).json({ error: 'Conta indisponível.' });
    req.session = { id: user.id, role: user.role }; next();
  }
  catch { res.status(401).json({ error: 'Sessão expirada. Entre novamente.' }); }
}
function admin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.session?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso restrito ao administrador.' });
  next();
}
const publicUser = { id: true, name: true, email: true, phone: true, role: true, commission: true, workStart: true, workEnd: true, active: true } as const;
const userFields = z.object({ name: z.string().trim().min(2), email: z.string().email().transform(v => v.toLowerCase()), password: z.string().min(12), phone: z.string().trim().optional(), commission: z.number().min(0).max(100).default(40), workStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('09:00'), workEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('19:00') });
const userInput = userFields.refine(v => v.workEnd > v.workStart, { message: 'Fim do expediente deve ser após o início.' });
const serviceInput = z.object({ name: z.string().trim().min(2), description: z.string().trim().optional(), duration: z.number().int().min(5).max(480), price: z.number().min(0).max(100000) });
const clientInput = z.object({ name: z.string().trim().min(2), phone: z.string().trim().optional() });
const planInput = z.object({ name: z.string().trim().min(2), description: z.string().trim().optional(), price: z.number().positive().max(100000), visitsPerMonth: z.number().int().min(1).max(31), serviceIds: z.array(z.string().uuid()).min(1) });
const subscriptionInput = z.object({ clientId: z.string().uuid(), planId: z.string().uuid(), startDate: z.string().datetime({ offset: true }), billingDay: z.number().int().min(1).max(28) });
const appointmentInput = z.object({ date: z.string().datetime({ offset: true }), barberId: z.string().uuid(), clientId: z.string().uuid(), serviceId: z.string().uuid(), subscriptionId: z.string().uuid().optional() });
const statusInput = z.object({ status: z.nativeEnum(AppointmentStatus) });
const rangeInput = z.object({ from: z.string().datetime({ offset: true }), to: z.string().datetime({ offset: true }) }).refine(v => new Date(v.to) > new Date(v.from));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.post('/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }), wrap(async (req, res) => {
  const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.active || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
  const token = jwt.sign({ id: user.id, role: user.role }, secret!, { expiresIn: '12h' });
  res.cookie('bf_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 12 * 60 * 60 * 1000, path: '/' });
  return res.json({ user: await prisma.user.findUnique({ where: { id: user.id }, select: publicUser }) });
}));
app.post('/auth/logout', (_req, res) => { res.clearCookie('bf_session', { path: '/' }); res.json({ ok: true }); });
app.get('/auth/me', auth, wrap(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.session!.id }, select: publicUser });
  if (!user || !user.active) return res.status(401).json({ error: 'Conta indisponível.' });
  return res.json({ user });
}));

app.get('/users', auth, wrap(async (req, res) => {
  const where = req.session!.role === 'ADMIN' ? { active: true } : { id: req.session!.id, active: true };
  return res.json(await prisma.user.findMany({ where, select: publicUser, orderBy: { name: 'asc' } }));
}));
app.post('/users', auth, admin, wrap(async (req, res) => {
  const data = userInput.parse(req.body);
  const user = await prisma.user.create({ data: { ...data, password: await bcrypt.hash(data.password, 12), role: 'BARBEIRO' }, select: publicUser });
  return res.status(201).json(user);
}));
app.patch('/users/:id', auth, admin, wrap(async (req, res) => {
  const data = userFields.omit({ password: true }).partial().parse(req.body);
  const current = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!current || current.role !== 'BARBEIRO') return res.status(404).json({ error: 'Barbeiro não encontrado.' });
  if ((data.workEnd || current.workEnd) <= (data.workStart || current.workStart)) return res.status(400).json({ error: 'Horário de expediente inválido.' });
  const user = await prisma.user.update({ where: { id: req.params.id, role: 'BARBEIRO' }, data, select: publicUser });
  return res.json(user);
}));
app.delete('/users/:id', auth, admin, wrap(async (req, res) => {
  await prisma.user.update({ where: { id: req.params.id, role: 'BARBEIRO' }, data: { active: false } });
  return res.status(204).send();
}));

app.get('/services', auth, wrap(async (_req, res) => res.json(await prisma.service.findMany({ where: { active: true }, orderBy: { name: 'asc' } }))));
app.post('/services', auth, admin, wrap(async (req, res) => res.status(201).json(await prisma.service.create({ data: serviceInput.parse(req.body) }))));
app.put('/services/:id', auth, admin, wrap(async (req, res) => res.json(await prisma.service.update({ where: { id: req.params.id }, data: serviceInput.parse(req.body) }))));
app.delete('/services/:id', auth, admin, wrap(async (req, res) => { await prisma.service.update({ where: { id: req.params.id }, data: { active: false } }); return res.status(204).send(); }));

app.get('/clients', auth, admin, wrap(async (_req, res) => res.json(await prisma.client.findMany({ orderBy: { name: 'asc' } }))));
app.post('/clients', auth, admin, wrap(async (req, res) => res.status(201).json(await prisma.client.create({ data: clientInput.parse(req.body) }))));

function periodOf(date: Date) { return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`; }
function invoiceDue(period: string, billingDay: number) { const [year, month] = period.split('-').map(Number); return new Date(Date.UTC(year, month - 1, billingDay, 12)); }
async function syncSubscriptionInvoices() {
  const subscriptions = await prisma.clientSubscription.findMany({ where: { status: 'ATIVA' }, select: { id: true, billingFrom: true, billingDay: true, price: true } });
  const current = periodOf(new Date());
  const records: { subscriptionId: string; period: string; dueDate: Date; amount: Prisma.Decimal }[] = [];
  for (const subscription of subscriptions) {
    let year = subscription.billingFrom.getUTCFullYear(); let month = subscription.billingFrom.getUTCMonth() + 1;
    while (`${year}-${String(month).padStart(2, '0')}` <= current) {
      const period = `${year}-${String(month).padStart(2, '0')}`;
      records.push({ subscriptionId: subscription.id, period, dueDate: invoiceDue(period, subscription.billingDay), amount: subscription.price });
      month++; if (month === 13) { month = 1; year++; }
    }
  }
  if (records.length) await prisma.subscriptionPayment.createMany({ data: records, skipDuplicates: true });
}

app.get('/subscription-plans', auth, admin, wrap(async (_req, res) => res.json(await prisma.subscriptionPlan.findMany({ where: { active: true }, include: { services: { select: { id: true, name: true } }, _count: { select: { subscriptions: true } } }, orderBy: { createdAt: 'desc' } }))));
app.post('/subscription-plans', auth, admin, wrap(async (req, res) => {
  const { serviceIds, ...data } = planInput.parse(req.body);
  const count = await prisma.service.count({ where: { id: { in: serviceIds }, active: true } });
  if (count !== new Set(serviceIds).size) return res.status(400).json({ error: 'Selecione serviços ativos e válidos.' });
  return res.status(201).json(await prisma.subscriptionPlan.create({ data: { ...data, services: { connect: serviceIds.map(id => ({ id })) } } }));
}));
app.put('/subscription-plans/:id', auth, admin, wrap(async (req, res) => {
  const { serviceIds, ...data } = planInput.parse(req.body);
  const count = await prisma.service.count({ where: { id: { in: serviceIds }, active: true } });
  if (count !== new Set(serviceIds).size) return res.status(400).json({ error: 'Selecione serviços ativos e válidos.' });
  return res.json(await prisma.subscriptionPlan.update({ where: { id: req.params.id }, data: { ...data, services: { set: serviceIds.map(id => ({ id })) } } }));
}));
app.delete('/subscription-plans/:id', auth, admin, wrap(async (req, res) => { await prisma.subscriptionPlan.update({ where: { id: req.params.id }, data: { active: false } }); return res.status(204).send(); }));

app.get('/subscriptions', auth, admin, wrap(async (_req, res) => {
  await syncSubscriptionInvoices();
  const now = new Date(); const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)); const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const subscriptions = await prisma.clientSubscription.findMany({ include: { client: true, plan: true, includedServices: { select: { id: true } }, payments: { orderBy: { dueDate: 'desc' } }, appointments: { where: { status: { not: 'CANCELADO' }, date: { gte: monthStart, lt: monthEnd } }, select: { id: true } } }, orderBy: { createdAt: 'desc' } });
  return res.json(subscriptions.map(({ appointments, ...subscription }) => ({ ...subscription, visitsUsed: appointments.length })));
}));
app.post('/subscriptions', auth, admin, wrap(async (req, res) => {
  const input = subscriptionInput.parse(req.body);
  const date = new Date(input.startDate);
  if (date.getUTCFullYear() < 2000 || date > new Date(Date.now() + 366 * 86400000)) return res.status(400).json({ error: 'Data de início inválida.' });
  const [client, plan, existing] = await Promise.all([
    prisma.client.findUnique({ where: { id: input.clientId } }),
    prisma.subscriptionPlan.findFirst({ where: { id: input.planId, active: true }, include: { services: true } }),
    prisma.clientSubscription.findFirst({ where: { clientId: input.clientId, status: { in: ['ATIVA', 'PAUSADA'] } } })
  ]);
  if (!client || !plan) return res.status(400).json({ error: 'Cliente ou plano inválido.' });
  if (existing) return res.status(409).json({ error: 'Cliente já possui uma assinatura ativa ou pausada.' });
  const subscription = await prisma.clientSubscription.create({ data: { ...input, startDate: date, billingFrom: date, price: plan.price, visitsPerMonth: plan.visitsPerMonth, includedServices: { connect: plan.services.map(service => ({ id: service.id })) } }, include: { client: true, plan: true } });
  if (date <= new Date()) await syncSubscriptionInvoices();
  return res.status(201).json(subscription);
}));
app.patch('/subscriptions/:id', auth, admin, wrap(async (req, res) => {
  const { status } = z.object({ status: z.nativeEnum(SubscriptionStatus) }).parse(req.body);
  const before = await prisma.clientSubscription.findUnique({ where: { id: req.params.id } });
  if (!before) return res.status(404).json({ error: 'Assinatura não encontrada.' });
  const subscription = await prisma.clientSubscription.update({ where: { id: req.params.id }, data: { status, ...(status === 'ATIVA' && before.status === 'PAUSADA' ? { billingFrom: new Date() } : {}) } });
  if (status === 'ATIVA') await syncSubscriptionInvoices();
  return res.json(subscription);
}));
app.post('/subscription-payments/:id/pay', auth, admin, wrap(async (req, res) => {
  const current = await prisma.subscriptionPayment.findUnique({ where: { id: req.params.id }, include: { subscription: true } });
  if (!current) return res.status(404).json({ error: 'Cobrança não encontrada.' });
  return res.json(await prisma.subscriptionPayment.update({ where: { id: current.id }, data: { status: 'PAGO', paidAt: new Date() } }));
}));
app.post('/subscription-payments/:id/reopen', auth, admin, wrap(async (req, res) => res.json(await prisma.subscriptionPayment.update({ where: { id: req.params.id }, data: { status: 'PENDENTE', paidAt: null } }))));

app.get('/appointments', auth, wrap(async (req, res) => {
  const { from, to } = rangeInput.parse(req.query);
  const where: Prisma.AppointmentWhereInput = { date: { gte: new Date(from), lt: new Date(to) } };
  if (req.session!.role === 'BARBEIRO') where.barberId = req.session!.id;
  return res.json(await prisma.appointment.findMany({ where, include: { barber: { select: publicUser }, client: true, service: true }, orderBy: { date: 'asc' } }));
}));
app.post('/appointments', auth, admin, wrap(async (req, res) => {
  const input = appointmentInput.parse(req.body);
  const service = await prisma.service.findFirst({ where: { id: input.serviceId, active: true } });
  const barber = await prisma.user.findFirst({ where: { id: input.barberId, role: 'BARBEIRO', active: true } });
  if (!service || !barber) return res.status(400).json({ error: 'Serviço ou barbeiro indisponível.' });
  const date = new Date(input.date);
  const end = new Date(date.getTime() + service.duration * 60000);
  const created = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.barberId}))`;
    const existing = await tx.appointment.findMany({ where: { barberId: input.barberId, status: { not: 'CANCELADO' }, date: { gte: new Date(date.getTime() - 480 * 60000), lt: end } }, include: { service: true } });
    if (existing.some(a => a.date < end && new Date(a.date.getTime() + a.service.duration * 60000) > date)) return null;
    if (input.subscriptionId) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.subscriptionId}))`;
      const subscription = await tx.clientSubscription.findUnique({ where: { id: input.subscriptionId }, include: { includedServices: { select: { id: true } }, payments: { where: { period: periodOf(date), status: 'PAGO' }, select: { id: true } } } });
      if (!subscription || subscription.status !== 'ATIVA' || subscription.clientId !== input.clientId || date < subscription.startDate) throw new ApiError(400, 'Assinatura inválida para este cliente ou data.');
      if (!subscription.includedServices.some(item => item.id === input.serviceId)) throw new ApiError(400, 'Serviço não incluído na assinatura.');
      if (!subscription.payments.length) throw new ApiError(409, 'Mensalidade do período ainda não foi paga.');
      const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
      const monthEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
      const used = await tx.appointment.count({ where: { subscriptionId: subscription.id, status: { not: 'CANCELADO' }, date: { gte: monthStart, lt: monthEnd } } });
      if (used >= subscription.visitsPerMonth) throw new ApiError(409, 'Limite mensal de atendimentos atingido.');
    }
    return tx.appointment.create({ data: { ...input, date, priceAtBooking: service.price, commissionAtBooking: barber.commission }, include: { barber: { select: publicUser }, client: true, service: true } });
  });
  if (!created) return res.status(409).json({ error: 'Esse horário conflita com outro agendamento.' });
  return res.status(201).json(created);
}));
app.patch('/appointments/:id/status', auth, wrap(async (req, res) => {
  const { status } = statusInput.parse(req.body);
  const current = await prisma.appointment.findUnique({ where: { id: req.params.id } });
  if (!current) return res.status(404).json({ error: 'Agendamento não encontrado.' });
  if (req.session!.role === 'BARBEIRO' && current.barberId !== req.session!.id) return res.status(403).json({ error: 'Acesso negado.' });
  return res.json(await prisma.appointment.update({ where: { id: current.id }, data: { status } }));
}));

app.get('/earnings/me', auth, wrap(async (req, res) => {
  const { from, to } = rangeInput.parse(req.query);
  const rows = await prisma.appointment.findMany({ where: { barberId: req.session!.id, status: 'CONCLUIDO', date: { gte: new Date(from), lt: new Date(to) } }, include: { service: true, barber: { select: { commission: true } } } });
  const production = rows.reduce((sum, row) => sum + Number(row.priceAtBooking ?? row.service.price), 0);
  const commission = rows.reduce((sum, row) => sum + Number(row.priceAtBooking ?? row.service.price) * Number(row.commissionAtBooking ?? row.barber.commission) / 100, 0);
  return res.json({ count: rows.length, gross: production, commission });
}));

app.get('/finance', auth, admin, wrap(async (req, res) => {
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

app.get('/finance/dashboard', auth, admin, wrap(async (req, res) => {
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

app.get('/finance/export.csv', auth, admin, wrap(async (req, res) => {
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

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ApiError) return res.status(error.status).json({ error: error.message });
  if (error instanceof ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Dados inválidos.' });
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Registro já existente.' });
    if (error.code === 'P2025') return res.status(404).json({ error: 'Registro não encontrado.' });
    if (error.code === 'P2003') return res.status(400).json({ error: 'Referência inválida.' });
  }
  console.error(error);
  return res.status(500).json({ error: 'Erro interno do servidor.' });
});
const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`BarberFlow API: http://localhost:${port}`));
