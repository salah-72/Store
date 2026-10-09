import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import { CreateSupplierInput } from './supplier.validation';
import * as service from './supplier.service';

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
