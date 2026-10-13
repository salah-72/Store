import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import * as service from './purchase-return.service';

export const getOne = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  res.json({ success: true, data: await service.getPurchaseReturn(id) });
});
