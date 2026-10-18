"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExpense = createExpense;
exports.getExpense = getExpense;
exports.updateExpense = updateExpense;
exports.deleteExpense = deleteExpense;
exports.listExpenses = listExpenses;
exports.listCategories = listCategories;
const postgres_1 = require("../../config/postgres.js");
const date_1 = require("../../common/utils/date.js");
const appError_1 = __importDefault(require("../../common/utils/appError.js"));
const client_1 = require("@prisma/client");
const expense_helpers_1 = require("./expense.helpers");
async function existingCategories() {
    const rows = await postgres_1.prisma.expense.findMany({
        distinct: ['category'],
        select: { category: true },
    });
    return rows.map((r) => r.category);
}
const dayRange = (from, to) => from || to
    ? {
        date: {
            ...(from ? { gte: (0, date_1.cairoStartOfDay)(from) } : {}),
            ...(to ? { lt: (0, date_1.cairoStartOfDay)((0, date_1.addDaysYMD)(to, 1)) } : {}), // the whole "to" day
        },
    }
    : {};
async function createExpense(input) {
    return postgres_1.prisma.expense.create({
        data: {
            category: (0, expense_helpers_1.canonicalCategory)(input.category, await existingCategories()),
            amount: input.amount,
            date: (0, date_1.resolveDocDate)(input.date, (0, date_1.cairoToday)(), 'Expense date'),
            note: input.note?.trim() || null,
        },
    });
}
async function getExpense(id) {
    const expense = await postgres_1.prisma.expense.findUnique({ where: { id } });
    if (!expense)
        throw new appError_1.default('Expense not found', 404);
    return expense;
}
async function updateExpense(id, input) {
    const current = await getExpense(id);
    return postgres_1.prisma.expense.update({
        where: { id },
        data: {
            category: input.category === undefined
                ? undefined
                : (0, expense_helpers_1.canonicalCategory)(input.category, await existingCategories()),
            amount: input.amount,
            note: input.note === undefined ? undefined : input.note?.trim() || null,
            date: input.date && input.date !== (0, date_1.cairoDay)(current.date)
                ? (0, date_1.resolveDocDate)(input.date, (0, date_1.cairoToday)(), 'Expense date')
                : undefined,
        },
    });
}
async function deleteExpense(id) {
    const r = await postgres_1.prisma.expense.deleteMany({ where: { id } });
    if (r.count === 0)
        throw new appError_1.default('Expense not found', 404);
}
const ZERO = new client_1.Prisma.Decimal(0);
async function listExpenses(q) {
    const range = dayRange(q.from, q.to);
    const where = { ...range };
    if (q.category)
        where.category = (0, expense_helpers_1.canonicalCategory)(q.category, await existingCategories());
    if (q.search)
        where.note = { contains: q.search, mode: 'insensitive' };
    const [total, rows, sum, byCategory] = await Promise.all([
        postgres_1.prisma.expense.count({ where }),
        postgres_1.prisma.expense.findMany({
            where,
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            skip: (q.page - 1) * q.limit,
            take: q.limit,
        }),
        postgres_1.prisma.expense.aggregate({ where, _sum: { amount: true } }), // all the matching expenses, not just this page
        postgres_1.prisma.expense.groupBy({
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
async function listCategories() {
    const rows = await postgres_1.prisma.expense.groupBy({
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
