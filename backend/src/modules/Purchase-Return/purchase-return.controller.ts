import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import * as service from './purchase-return.service';
import { CreatePurchaseReturnInput } from './purchase-return.validation';

export const getOne = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  res.json({ success: true, data: await service.getPurchaseReturn(id) });
});

export const create = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as CreatePurchaseReturnInput;
  const ret = await service.createPurchaseReturn(input);
  res.status(201).json({ success: true, data: ret });
});
