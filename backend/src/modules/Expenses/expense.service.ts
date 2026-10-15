import { prisma } from '@/config/postgres';
import { CreateExpenseInput } from './expense.validation';
import { cairoToday, resolveDocDate } from '@/common/utils/date';
import appError from '@/common/utils/appError';

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

export async function getExpense(id: number) {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) throw new appError('Expense not found', 404);
  return expense;
}
