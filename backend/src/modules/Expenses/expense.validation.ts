import { z } from 'zod';
import { money, pagination, ymd } from '../../common/utils/schemas';

const amount = money.refine((v) => v > 0, 'Amount must be greater than zero');

const category = z.string().trim().min(1, 'Category is required').max(50);

export const createExpenseSchema = z.object({
  category,
  amount,
  date: ymd.optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

export const updateExpenseSchema = z
  .object({
    category: category.optional(),
    amount: amount.optional(),
    date: ymd.optional(),
    note: z.string().trim().max(500).nullable().optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: 'Nothing to update' });

export const listExpensesQuery = pagination.extend({
  search: z.string().trim().max(100).optional(),
  from: ymd.optional(),
  to: ymd.optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuery>;
