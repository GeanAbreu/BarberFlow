import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const wrap = <T extends Request>(handler: (req: T, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(handler(req as T, res)).catch(next);

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ApiError) return res.status(error.status).json({ error: error.message });
  if (error instanceof ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Dados inválidos.' });
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Registro já existente.' });
    if (error.code === 'P2025') return res.status(404).json({ error: 'Registro não encontrado.' });
    if (error.code === 'P2003') return res.status(400).json({ error: 'Referência inválida.' });
  }
  console.error(error);
  return res.status(500).json({ error: 'Erro interno do servidor.' });
}
