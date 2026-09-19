import { Router } from 'express';
import { admin, auth } from '../../core/auth';
import { wrap } from '../../core/errors';
import { operationsController } from './operations.controller';

export const operationsRouter=Router();
operationsRouter.get('/operations/summary',auth,admin,wrap(operationsController.summary));
operationsRouter.post('/expenses',auth,admin,wrap(operationsController.expense));
operationsRouter.post('/cash-closings',auth,admin,wrap(operationsController.close));
operationsRouter.get('/schedule-blocks',auth,wrap(operationsController.blocks));
operationsRouter.post('/schedule-blocks',auth,admin,wrap(operationsController.block));
operationsRouter.delete('/schedule-blocks/:id',auth,admin,wrap(operationsController.removeBlock));
operationsRouter.get('/clients/:id/history',auth,admin,wrap(operationsController.history));
operationsRouter.post('/reminders/process',auth,admin,wrap(operationsController.reminders));
