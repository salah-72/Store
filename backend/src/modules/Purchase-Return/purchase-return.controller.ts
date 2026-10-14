import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import * as service from './purchase-return.service';
import {
  CreatePurchaseReturnInput,
  ListPurchaseReturnsQuery,
  UpdatePurchaseReturnInput,
} from './purchase-return.validation';
import { pageMeta } from '@/common/utils/schemas';

export const getOne = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  res.json({ success: true, data: await service.getPurchaseReturn(id) });
});

export const create = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as CreatePurchaseReturnInput;
  const ret = await service.createPurchaseReturn(input);
  res.status(201).json({ success: true, data: ret });
});

export const update = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const input = req.body as UpdatePurchaseReturnInput;
  const ret = await service.updatePurchaseReturn(id, input);
  res.json({ success: true, data: ret });
});

export const remove = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await service.deletePurchaseReturn(id);
  res.json({ success: true, data: { id } });
});

export const list = catchAsync(async (req: Request, res: Response) => {
  const q = req.query as unknown as ListPurchaseReturnsQuery;
  const { returns, total } = await service.listPurchaseReturns(q);
  res.json({
    success: true,
    data: returns,
    meta: pageMeta(total, q.page, q.limit),
  });
});
