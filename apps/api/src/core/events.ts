import { Response } from 'express';

type Listener = { id: string; userId: string; role: string; response: Response };
const listeners = new Map<string, Listener>();

export function subscribe(userId: string, role: string, response: Response) {
  const id = crypto.randomUUID();
  listeners.set(id, { id, userId, role, response });
  response.write(`event: connected\ndata: ${JSON.stringify({ connected: true })}\n\n`);
  return () => listeners.delete(id);
}

export function publish(type: string, payload: Record<string, unknown>, barberId?: string) {
  const message = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const listener of listeners.values()) {
    if (listener.role === 'ADMIN' || !barberId || listener.userId === barberId) listener.response.write(message);
  }
}

setInterval(() => { for (const listener of listeners.values()) listener.response.write(': keep-alive\n\n'); }, 25_000).unref();
