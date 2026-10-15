import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import { OverviewQuery } from './stats.validation';
import * as service from './stats.service';

export const overview = catchAsync(async (req: Request, res: Response) => {
  const { from, to } = req.query as OverviewQuery;
  res.json({ success: true, data: await service.getOverview(from, to) });
});
