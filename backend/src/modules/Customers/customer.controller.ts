import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import {
  CreateCustomerInput,
  ListCustomersQuery,
  SetCustomerStatusInput,
  StatementQuery,
  UpdateCustomerInput,
} from './customer.validation';
import * as service from './customer.service';
import { ListSuppliersQuery } from '../Suppliers/supplier.validation';
import { pageMeta } from '@/common/utils/schemas';

export const createCustomer = catchAsync(
  async (req: Request, res: Response) => {
    const input = req.body as CreateCustomerInput;
    const customer = await service.createCustomer(input);
    res.status(201).json({ success: true, data: customer });
  },
);

export const update = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const input = req.body as UpdateCustomerInput;
  const customer = await service.updateCustomer(id, input);
  res.json({ success: true, data: customer });
});

export const setStatus = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { isActive } = req.body as SetCustomerStatusInput;
  res.json({
    success: true,
    data: await service.setCustomerStatus(id, isActive),
  });
});

export const getCustomerList = catchAsync(
  async (req: Request, res: Response) => {
    const q = req.query as unknown as ListCustomersQuery;
    q.page = Number(q.page) || 1;
    q.limit = Number(q.limit) || 20;
    const { customers, total } = await service.listCustomers(q);
    res.json({
      success: true,
      data: customers,
      meta: pageMeta(total, q.page, q.limit),
    });
  },
);

export const getCustomer = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  res.json({ success: true, data: await service.getCustomer(id) });
});

export const statement = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { from, to } = req.query as StatementQuery;
  res.json({ success: true, data: await service.getStatement(id, from, to) });
});
