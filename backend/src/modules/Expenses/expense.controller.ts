import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import { CreateExpenseInput, UpdateExpenseInput } from './expense.validation';
import * as service from './expense.service';

export const create = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as CreateExpenseInput;
  const expense = await service.createExpense(input);
  res.status(201).json({ success: true, data: expense });
});

export const getOne = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  res.json({ success: true, data: await service.getExpense(id) });
});

export const update = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const input = req.body as UpdateExpenseInput;
  const expense = await service.updateExpense(id, input);
  res.json({ success: true, data: expense });
});
