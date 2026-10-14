import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import { CreatePaymentInput, UpdatePaymentInput } from './payment.validation';
import * as service from './payment.service';

export const create = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as CreatePaymentInput;
  const payment = await service.createPayment(input);
  res.status(201).json({ success: true, data: payment });
});

export const getOne = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  res.json({ success: true, data: await service.getPayment(id) });
});

export const update = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const input = req.body as UpdatePaymentInput;
  const payment = await service.updatePayment(id, input);
  res.json({ success: true, data: payment });
});
