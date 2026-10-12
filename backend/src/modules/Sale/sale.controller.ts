import catchAsync from '@/common/utils/catchAsync';
import * as service from './sale.service';
import { Request, Response } from 'express';
import {
  CreateSaleInput,
  ListSalesQuery,
  UpdateSaleInput,
} from './sale.validation';
import { pageMeta } from '@/common/utils/schemas';

export const list = catchAsync(async (req: Request, res: Response) => {
  const q = req.query as unknown as ListSalesQuery;
  const { sales, total } = await service.listSales(q);
  res.json({
    success: true,
    data: sales,
    meta: pageMeta(total, q.page, q.limit),
  });
});

export const create = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as CreateSaleInput;
  const sale = await service.createSale(input);
  res.status(201).json({ success: true, data: sale });
});

export const getSale = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  res.json({ success: true, data: await service.getSale(id) });
});

export const update = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const input = req.body as UpdateSaleInput;
  const sale = await service.updateSale(id, input);
  res.json({ success: true, data: sale });
});

export const remove = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await service.deleteSale(id);
  res.json({ success: true, data: { id } });
});
