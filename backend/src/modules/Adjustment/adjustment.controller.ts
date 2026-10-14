import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import {
  CreateAdjustmentInput,
  UpdateAdjustmentInput,
} from './adjustment.validation';
import * as service from './adjustment.service';

export const create = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as CreateAdjustmentInput;
  const adjustment = await service.createAdjustment(input);
  res.status(201).json({ success: true, data: adjustment });
});

export const getOne = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  res.json({ success: true, data: await service.getAdjustment(id) });
});

export const update = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const input = req.body as UpdateAdjustmentInput;
  const adj = await service.updateAdjustment(id, input);
  res.json({ success: true, data: adj });
});
