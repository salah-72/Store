import { Request, Response } from 'express';
import catchAsync from '../../common/utils/catchAsync';
import * as service from './item.service';
import type { CreateItemInput } from './item.validation';

export const createItem = catchAsync(async (req: Request, res: Response) => {
  const input = req.body;
  const item = await service.createItem(input as CreateItemInput);
  res.status(201).json({ success: true, data: item });
});
