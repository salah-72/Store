import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import {
  CreateSupplierInput,
  ListSuppliersQuery,
  StatementQuery,
  UpdateSupplierInput,
  setSupplierStatusInput,
} from './supplier.validation';
import * as service from './supplier.service';
import { pageMeta } from '@/common/utils/schemas';

export const createSupplier = catchAsync(
  async (req: Request, res: Response) => {
    const input = req.body as CreateSupplierInput;
    const supplier = await service.createSupplierService(input);
    res.status(201).json({
      status: true,
      data: supplier,
    });
  },
);

export const updateSupplier = catchAsync(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const input = req.body as UpdateSupplierInput;
    const supplier = await service.updateSupplierService(id, input);
    res.status(200).json({
      status: true,
      data: supplier,
    });
  },
);

export const setSupplierStatus = catchAsync(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { isActive } = req.body as setSupplierStatusInput;
    const supplier = await service.setSupplierStatusService(id, isActive);
    res.status(200).json({
      status: true,
      data: supplier,
    });
  },
);

export const getSupplierList = catchAsync(
  async (req: Request, res: Response) => {
    const q = req.query as unknown as ListSuppliersQuery;
    q.page = Number(q.page) || 1;
    q.limit = Number(q.limit) || 20;
    const { suppliers, total } = await service.listSuppliers(q);
    res.json({
      success: true,
      data: suppliers,
      meta: pageMeta(total, q.page, q.limit),
    });
  },
);

export const getSupplier = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  res.json({ success: true, data: await service.getSupplier(id) });
});

export const statement = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { from, to } = req.query as StatementQuery;
  res.json({ success: true, data: await service.getStatement(id, from, to) });
});
