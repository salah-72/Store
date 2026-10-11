import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import {
  CreateCustomerInput,
  SetCustomerStatusInput,
  UpdateCustomerInput,
} from './customer.validation';
import * as service from './customer.service';

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
