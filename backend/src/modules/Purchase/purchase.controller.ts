import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import * as service from './purchase.service';
import { CreatePurchaseInput } from './purchase.validation';

export const createPurchase = catchAsync(
  async (req: Request, res: Response) => {
    const input = req.body as CreatePurchaseInput;
    const purchase = await service.createPurchase(input);
    res.status(201).json({ success: true, data: purchase });
  },
);
