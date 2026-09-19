import { Router } from 'express';
import { admin, auth, AuthedRequest } from '../../core/auth';
import { wrap } from '../../core/errors';
import { subscribe } from '../../core/events';
import { appointmentsController } from './appointments.controller';

export const appointmentsRouter = Router();
appointmentsRouter.get('/events', auth, (req: AuthedRequest, res) => {
  res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache'); res.setHeader('Connection', 'keep-alive'); res.flushHeaders();
  const close = subscribe(req.session!.id, req.session!.role, res); req.on('close', close);
});
appointmentsRouter.get('/appointments', auth, wrap(appointmentsController.list));
appointmentsRouter.post('/appointments', auth, admin, wrap(appointmentsController.create));
appointmentsRouter.patch('/appointments/:id/status', auth, wrap(appointmentsController.status));
