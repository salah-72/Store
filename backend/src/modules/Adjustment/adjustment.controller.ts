import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import { CreateAdjustmentInput } from './adjustment.validation';
import * as service from './adjustment.service';

export const create = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as CreateAdjustmentInput;
  const adjustment = await service.createAdjustment(input);
  res.status(201).json({ success: true, data: adjustment });
});
