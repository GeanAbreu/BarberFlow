import { PaymentMethod } from '@prisma/client';
import { Response } from 'express';
import { z } from 'zod';
import { AuthedRequest } from '../../core/auth';
import { rangeInput } from '../../core/schemas';
import { operationsRepository } from './operations.repository';
import { operationsService } from './operations.service';

const expenseInput=z.object({description:z.string().trim().min(2),category:z.string().trim().min(2),amount:z.number().positive(),date:z.string().datetime({offset:true}),paymentMethod:z.nativeEnum(PaymentMethod)});
const blockInput=z.object({barberId:z.string().uuid(),start:z.string().datetime({offset:true}),end:z.string().datetime({offset:true}),reason:z.string().trim().min(2).max(200)});
const closingInput=z.object({businessDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),openingAmount:z.number().min(0),actualAmount:z.number().min(0),notes:z.string().trim().max(500).optional()});

export const operationsController={
 summary:async(req:AuthedRequest,res:Response)=>{const{from,to}=rangeInput.parse(req.query);return res.json(await operationsService.summary(new Date(from),new Date(to)));},
 expense:async(req:AuthedRequest,res:Response)=>res.status(201).json(await operationsService.addExpense(expenseInput.parse(req.body),req.session!.id)),
 close:async(req:AuthedRequest,res:Response)=>res.status(201).json(await operationsService.closeCash(closingInput.parse(req.body),req.session!.id)),
 blocks:async(req:AuthedRequest,res:Response)=>{const{from,to}=rangeInput.parse(req.query);const barberId=req.session?.role==='BARBEIRO'?req.session.id:undefined;return res.json(await operationsRepository.blocks(new Date(from),new Date(to),barberId));},
 block:async(req:AuthedRequest,res:Response)=>res.status(201).json(await operationsService.addBlock(blockInput.parse(req.body))),
 removeBlock:async(req:AuthedRequest,res:Response)=>{const block=await operationsRepository.deleteBlock(req.params.id);publishBlock(block.barberId,block.id);return res.status(204).send();},
 history:async(req:AuthedRequest,res:Response)=>res.json(await operationsService.clientHistory(req.params.id)),
 reminders:async(_req:AuthedRequest,res:Response)=>res.json(await operationsService.processReminders())
};
function publishBlock(barberId:string,blockId:string){import('../../core/events').then(({publish})=>publish('agenda.updated',{action:'block-removed',blockId},barberId));}
