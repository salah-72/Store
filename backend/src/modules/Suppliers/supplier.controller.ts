import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import {
  CreateSupplierInput,
  UpdateSupplierInput,
  setSupplierStatusInput,
} from './supplier.validation';
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
