import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppointmentStatus, Prisma, PrismaClient, Role } from '@prisma/client';
import { z, ZodError } from 'zod';

const prisma = new PrismaClient();
const app = express();
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
const appointmentInput = z.object({ date: z.string().datetime({ offset: true }), barberId: z.string().uuid(), clientId: z.string().uuid(), serviceId: z.string().uuid() });
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
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${input.barberId}))`;
    const existing = await tx.appointment.findMany({ where: { barberId: input.barberId, status: { not: 'CANCELADO' }, date: { gte: new Date(date.getTime() - 480 * 60000), lt: end } }, include: { service: true } });
    if (existing.some(a => a.date < end && new Date(a.date.getTime() + a.service.duration * 60000) > date)) return null;
    return tx.appointment.create({ data: { ...input, date }, include: { barber: { select: publicUser }, client: true, service: true } });
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

app.get('/finance', auth, wrap(async (req, res) => {
  const { from, to } = rangeInput.parse(req.query);
  const where: Prisma.AppointmentWhereInput = { status: 'CONCLUIDO', date: { gte: new Date(from), lt: new Date(to) } };
  if (req.session!.role === 'BARBEIRO') where.barberId = req.session!.id;
  const rows = await prisma.appointment.findMany({ where, include: { barber: { select: publicUser }, service: true }, orderBy: { date: 'desc' } });
  const byBarber = new Map<string, { id: string; name: string; count: number; gross: number; commission: number }>();
  for (const row of rows) {
    const value = Number(row.service.price);
    const item = byBarber.get(row.barberId) || { id: row.barberId, name: row.barber.name, count: 0, gross: 0, commission: 0 };
    item.count++; item.gross += value; item.commission += value * Number(row.barber.commission) / 100;
    byBarber.set(row.barberId, item);
  }
  return res.json({ count: rows.length, gross: rows.reduce((sum, row) => sum + Number(row.service.price), 0), byBarber: [...byBarber.values()], rows: rows.map(row => ({ id: row.id, date: row.date, barber: row.barber.name, service: row.service.name, price: Number(row.service.price) })) });
}));

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
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
