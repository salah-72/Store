import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import * as service from './sale-return.service';
import {
  CreateSaleReturnInput,
  UpdateSaleReturnInput,
} from './sale-return.validation';

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

export const update = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const input = req.body as UpdateSaleReturnInput;
  const ret = await service.updateSaleReturn(id, input);
  res.json({ success: true, data: ret });
});

export const remove = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await service.deleteSaleReturn(id);
  res.json({ success: true, data: { id } });
});
