import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import * as service from './sale-return.service';
import { CreateSaleReturnInput } from './sale-return.validation';

export const getSaleReturn = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const saleReturn = await service.getSaleReturn(id);
  res.status(201).json({ success: true, data: saleReturn });
});

export const create = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as CreateSaleReturnInput;
  const ret = await service.createSaleReturn(input);
  res.status(201).json({ success: true, data: ret });
});
