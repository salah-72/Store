import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import {
  DashboardQuery,
  OverviewQuery,
  SalesByDayQuery,
  StaleStockQuery,
  TopItemsQuery,
} from './stats.validation';
import * as service from './stats.service';

export const overview = catchAsync(async (req: Request, res: Response) => {
  const { from, to } = req.query as OverviewQuery;
  res.json({ success: true, data: await service.getOverview(from, to) });
});

export const salesByDay = catchAsync(async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: await service.getSalesByDay(req.query as SalesByDayQuery),
  });
});

export const topItems = catchAsync(async (req: Request, res: Response) => {
  const q = req.query as unknown as TopItemsQuery;
  q.limit = Number(q.limit) || 10;
  res.json({
    success: true,
    data: await service.getTopItems(q),
  });
});

export const staleStock = catchAsync(async (req: Request, res: Response) => {
  const q = req.query as unknown as StaleStockQuery;
  q.limit = Number(q.limit) || 30;
  res.json({ success: true, data: await service.getStaleStock(q) });
});

export const dashboard = catchAsync(async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: await service.getDashboard(req.query as unknown as DashboardQuery),
  });
});
