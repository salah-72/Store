import catchAsync from '@/common/utils/catchAsync';
import { Request, Response } from 'express';
import {
  CreateExpenseInput,
  ListExpensesQuery,
  UpdateExpenseInput,
} from './expense.validation';
import * as service from './expense.service';
import { pageMeta } from '@/common/utils/schemas';

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

export const remove = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await service.deleteExpense(id);
  res.json({ success: true, data: { id } });
});

export const list = catchAsync(async (req: Request, res: Response) => {
  const q = req.query as unknown as ListExpensesQuery;
  q.page = Number(q.page) || 1;
  q.limit = Number(q.limit) || 20;
  const { expenses, total, amount, byCategory } = await service.listExpenses(q);
  res.json({
    success: true,
    data: expenses,
    meta: pageMeta(total, q.page, q.limit),
    summary: { amount, byCategory },
  });
});

export const categories = catchAsync(async (req: Request, res: Response) => {
  res.json({ success: true, data: await service.listCategories() });
});
