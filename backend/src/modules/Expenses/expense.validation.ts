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

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
