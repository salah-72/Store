import catchAsync from '@/common/utils/catchAsync';
import * as service from './sale.service';
import { Request, Response } from 'express';
import { CreateSaleInput } from './sale.validation';

export const create = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as CreateSaleInput;
  const sale = await service.createSale(input);
  res.status(201).json({ success: true, data: sale });
});
