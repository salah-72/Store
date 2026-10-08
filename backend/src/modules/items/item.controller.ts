import { Request, Response } from 'express';
import catchAsync from '../../common/utils/catchAsync';
import * as service from './item.service';
import type {
  CreateItemInput,
  SetItemStatusInput,
  UpdateItemInput,
} from './item.validation';

export const createItem = catchAsync(async (req: Request, res: Response) => {
  const input = req.body;
  const item = await service.createItem(input as CreateItemInput);
  res.status(201).json({ success: true, data: item });
});

export const updateItem = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const input = req.body as UpdateItemInput;
  const item = await service.updateItem(id, input);
  res.json({ success: true, data: item });
});

export const setItemStatus = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { isActive } = req.body as SetItemStatusInput;
  res.json({ success: true, data: await service.setItemStatus(id, isActive) });
});
