import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import { CreatePaymentInput } from './payment.validation';
import * as service from './payment.service';

export const create = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as CreatePaymentInput;
  const payment = await service.createPayment(input);
  res.status(201).json({ success: true, data: payment });
});
