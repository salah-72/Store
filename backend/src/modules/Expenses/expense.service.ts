import { prisma } from '@/config/postgres';
import { CreateExpenseInput } from './expense.validation';
import { cairoToday, resolveDocDate } from '@/common/utils/date';

export async function createExpense(input: CreateExpenseInput) {
  return prisma.expense.create({
    data: {
      category: input.category,
      amount: input.amount,
      date: resolveDocDate(input.date, cairoToday(), 'Expense date'),
      note: input.note?.trim() || null,
    },
  });
}
