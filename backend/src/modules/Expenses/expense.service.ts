import { prisma } from '@/config/postgres';
import { CreateExpenseInput, UpdateExpenseInput } from './expense.validation';
import { cairoDay, cairoToday, resolveDocDate } from '@/common/utils/date';
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

export async function updateExpense(id: number, input: UpdateExpenseInput) {
  const current = await getExpense(id);
  if (!current) throw new appError('Expense not found', 404);

  return prisma.expense.update({
    where: { id },
    data: {
      category: input.category,
      amount: input.amount,
      note: input.note === undefined ? undefined : input.note?.trim() || null,
      date:
        input.date && input.date !== cairoDay(current.date)
          ? resolveDocDate(input.date, cairoToday(), 'Expense date')
          : undefined,
    },
  });
}

export async function deleteExpense(id: number) {
  const r = await prisma.expense.deleteMany({ where: { id } });
  if (r.count === 0) throw new appError('Expense not found', 404);
}
