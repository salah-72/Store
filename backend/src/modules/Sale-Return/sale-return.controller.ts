import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import * as service from './sale-return.service';

export const getSaleReturn = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const saleReturn = await service.getSaleReturn(id);
  res.status(201).json({ success: true, data: saleReturn });
});
