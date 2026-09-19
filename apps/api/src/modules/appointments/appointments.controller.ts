import { Response } from 'express';
import { AuthedRequest } from '../../core/auth';
import { appointmentInput, rangeInput, statusInput } from '../../core/schemas';
import { appointmentsService } from './appointments.service';

export const appointmentsController = {
  list: async (req: AuthedRequest, res: Response) => { const { from, to } = rangeInput.parse(req.query); return res.json(await appointmentsService.list(new Date(from), new Date(to), req.session!)); },
  create: async (req: AuthedRequest, res: Response) => res.status(201).json(await appointmentsService.create(appointmentInput.parse(req.body))),
  status: async (req: AuthedRequest, res: Response) => { const input = statusInput.parse(req.body); return res.json(await appointmentsService.updateStatus(req.params.id, input.status, req.session!, input.paymentMethod)); }
};
