import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import * as service from './purchase.service';
import {
  CreatePurchaseInput,
  UpdatePurchaseInput,
} from './purchase.validation';

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
