import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { prisma } from './database';

export type Session = { id: string; role: Role };
export type AuthedRequest = Request & { session?: Session };
export const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres.');

export async function auth(req: AuthedRequest, res: Response, next: NextFunction) {
  const cookie = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith('bf_session='))?.slice(11);
  try {
    const payload = jwt.verify(cookie || '', jwtSecret!) as Session;
    const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { id: true, role: true, active: true } });
    if (!user?.active) return res.status(401).json({ error: 'Conta indisponível.' });
    req.session = { id: user.id, role: user.role };
    next();
  } catch { return res.status(401).json({ error: 'Sessão expirada. Entre novamente.' }); }
}

export function admin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.session?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso restrito ao administrador.' });
  next();
}

export const publicUser = { id: true, name: true, email: true, phone: true, role: true, commission: true, workStart: true, workEnd: true, active: true } as const;
