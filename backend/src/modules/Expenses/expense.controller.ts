import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import { CreateExpenseInput } from './expense.validation';
import * as service from './expense.service';

export const create = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as CreateExpenseInput;
  const expense = await service.createExpense(input);
  res.status(201).json({ success: true, data: expense });
});
