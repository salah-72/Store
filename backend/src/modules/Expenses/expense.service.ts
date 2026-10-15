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
import { canonicalCategory } from './expense.helpers';

async function existingCategories() {
  const rows = await prisma.expense.findMany({
    distinct: ['category'],
    select: { category: true },
  });
  return rows.map((r) => r.category);
}

const dayRange = (from?: string, to?: string): Prisma.ExpenseWhereInput =>
  from || to
    ? {
        date: {
          ...(from ? { gte: cairoStartOfDay(from) } : {}),
          ...(to ? { lt: cairoStartOfDay(addDaysYMD(to, 1)) } : {}), // the whole "to" day
        },
      }
    : {};

export async function createExpense(input: CreateExpenseInput) {
  return prisma.expense.create({
    data: {
      category: canonicalCategory(input.category, await existingCategories()),
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

  return prisma.expense.update({
    where: { id },
    data: {
      category:
        input.category === undefined
          ? undefined
          : canonicalCategory(input.category, await existingCategories()),
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
  const range = dayRange(q.from, q.to);

  const where: Prisma.ExpenseWhereInput = { ...range };
  if (q.category)
    where.category = canonicalCategory(q.category, await existingCategories());
  if (q.search) where.note = { contains: q.search, mode: 'insensitive' };

  const [total, rows, sum, byCategory] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }), // all the matching expenses, not just this page
    prisma.expense.groupBy({
      by: ['category'],
      where: range,
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: 'desc' } },
    }),
  ]);

  return {
    expenses: rows,
    total,
    amount: sum._sum.amount ?? ZERO,
    byCategory: byCategory.map((r) => ({
      category: r.category,
      amount: r._sum.amount ?? ZERO,
      count: r._count._all,
    })),
  };
}

export async function listCategories() {
  const rows = await prisma.expense.groupBy({
    by: ['category'],
    _count: { _all: true },
    _sum: { amount: true },
    _max: { date: true },
    orderBy: { _count: { category: 'desc' } },
  });
  return rows.map((r) => ({
    category: r.category,
    count: r._count._all,
    amount: r._sum.amount ?? ZERO,
    lastUsed: r._max.date,
  }));
}
