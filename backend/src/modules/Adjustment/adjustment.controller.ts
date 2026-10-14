import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import {
  CreateAdjustmentInput,
  ListAdjustmentsQuery,
  UpdateAdjustmentInput,
} from './adjustment.validation';
import * as service from './adjustment.service';
import { pageMeta } from '@/common/utils/schemas';

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

export const remove = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await service.deleteAdjustment(id);
  res.json({ success: true, data: { id } });
});

export const list = catchAsync(async (req: Request, res: Response) => {
  const q = req.query as unknown as ListAdjustmentsQuery;
  q.page = Number(q.page) || 1;
  q.limit = Number(q.limit) || 20;
  const { adjustments, total, value } = await service.listAdjustments(q);
  res.json({
    success: true,
    data: adjustments,
    meta: pageMeta(total, q.page, q.limit),
    summary: { value },
  });
});
