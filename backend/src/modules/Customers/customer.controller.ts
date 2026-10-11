import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import { CreateCustomerInput } from './customer.validation';
import * as service from './customer.service';

export const createCustomer = catchAsync(
  async (req: Request, res: Response) => {
    const input = req.body as CreateCustomerInput;
    const customer = await service.createCustomer(input);
    res.status(201).json({ success: true, data: customer });
  },
);
