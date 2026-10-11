import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import * as service from './purchase.service';
import {
  CreatePurchaseInput,
  ListPurchasesQuery,
  UpdatePurchaseInput,
} from './purchase.validation';
import { pageMeta } from '@/common/utils/schemas';

export const createPurchase = catchAsync(
  async (req: Request, res: Response) => {
    const input = req.body as CreatePurchaseInput;
    const purchase = await service.createPurchase(input);
    res.status(201).json({ success: true, data: purchase });
  },
);

export const getPurchase = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  res.json({ success: true, data: await service.getPurchase(id) });
});

export const updatePurchase = catchAsync(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const input = req.body as UpdatePurchaseInput;
    const purchase = await service.updatePurchase(id, input);
    res.json({ success: true, data: purchase });
  },
);

export const listPurchases = catchAsync(async (req: Request, res: Response) => {
  const q = req.query as unknown as ListPurchasesQuery;
  q.page = Number(q.page) || 1;
  q.limit = Number(q.limit) || 20;
  const { purchases, total } = await service.listPurchases(q);
  res.json({
    success: true,
    data: purchases,
    meta: pageMeta(total, q.page, q.limit),
  });
});

export const deletePurchase = catchAsync(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await service.deletePurchase(id);
    res.json({ success: true, data: { id } });
  },
);
