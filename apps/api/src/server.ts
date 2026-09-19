import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { catalogRouter } from './modules/catalog/catalog.routes';
import { subscriptionsRouter } from './modules/subscriptions/subscriptions.routes';
import { appointmentsRouter } from './modules/appointments/appointments.routes';
import { financeRouter } from './modules/finance/finance.routes';
import { operationsRouter } from './modules/operations/operations.routes';
import { errorHandler } from './core/errors';

export function createApp() {
  const app = express();
  const origin = process.env.WEB_ORIGIN || 'http://localhost:3000';
  app.use(helmet());
  app.use(cors({ origin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.headers.origin && req.headers.origin !== origin) return res.status(403).json({ error: 'Origem não permitida.' });
    next();
  });
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use(authRouter, usersRouter, catalogRouter, subscriptionsRouter, appointmentsRouter, financeRouter, operationsRouter);
  app.use(errorHandler);
  return app;
}

const port = Number(process.env.PORT || 4000);
if (process.env.NODE_ENV !== 'test') createApp().listen(port, () => console.log(`BarberFlow API: http://localhost:${port}`));
