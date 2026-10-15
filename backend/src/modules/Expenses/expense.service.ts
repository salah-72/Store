import { prisma } from '@/config/postgres';
import {
  CreateExpenseInput,
  ListExpensesQuery,
  UpdateExpenseInput,
} from './expense.validation';
import {
  addDaysYMD,
  cairoDay,
  cairoStartOfDay,
  cairoToday,
  resolveDocDate,
} from '@/common/utils/date';
import appError from '@/common/utils/appError';
import { Prisma } from '@prisma/client';

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

const ZERO = new Prisma.Decimal(0);

export async function listExpenses(q: ListExpensesQuery) {
  const where: Prisma.ExpenseWhereInput = {};
  if (q.search) {
    where.OR = [
      { category: { contains: q.search, mode: 'insensitive' } },
      { note: { contains: q.search, mode: 'insensitive' } },
    ];
  }
  if (q.from || q.to) {
    where.date = {
      ...(q.from ? { gte: cairoStartOfDay(q.from) } : {}),
      ...(q.to ? { lt: cairoStartOfDay(addDaysYMD(q.to, 1)) } : {}), // the whole "to" day
    };
  }

  const [total, rows, sum] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
  ]);

  return {
    expenses: rows,
    total,
    amount: sum._sum.amount ?? ZERO,
  };
}
