import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import {
  CreatePaymentInput,
  ListPaymentsQuery,
  UpdatePaymentInput,
} from './payment.validation';
import * as service from './payment.service';
import { pageMeta } from '@/common/utils/schemas';

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

export const remove = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await service.deletePayment(id);
  res.json({ success: true, data: { id } });
});

export const list = catchAsync(async (req: Request, res: Response) => {
  const q = req.query as unknown as ListPaymentsQuery;
  q.page = Number(q.page) || 1;
  q.limit = Number(q.limit) || 20;
  const { payments, total, amount } = await service.listPayments(q);
  res.json({
    success: true,
    data: payments,
    meta: pageMeta(total, q.page, q.limit),
    summary: { amount },
  });
});
