import { prisma } from '@/config/postgres';
import {
  CreateCustomerInput,
  ListCustomersQuery,
  UpdateCustomerInput,
} from './customer.validation';
import appError from '@/common/utils/appError';
import { Prisma } from '@prisma/client';

const ZERO = new Prisma.Decimal(0);
const sum = (v: Prisma.Decimal | null | undefined) => v ?? ZERO;

async function isNameUnique(name: string) {
  const existingName = await prisma.customer.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
    },
  });
  if (existingName)
    throw new appError('A customer with this name already exists', 400);
}

async function summariesFor(
  customers: { id: number; openingBalance: Prisma.Decimal }[],
) {
  const result = new Map<
    number,
    {
      openingBalance: Prisma.Decimal;
      totalSales: Prisma.Decimal;
      totalReturns: Prisma.Decimal;
      netSales: Prisma.Decimal;
      totalPaid: Prisma.Decimal;
      remaining: Prisma.Decimal;
    }
  >();
  if (customers.length === 0) return result;

  const where = { customerId: { in: customers.map((c) => c.id) } };
  const [sales, payments, returns] = await Promise.all([
    prisma.sale.groupBy({
      by: ['customerId'],
      where,
      _sum: { total: true, paid: true },
    }),
    prisma.payment.groupBy({
      by: ['customerId'],
      where,
      _sum: { amount: true },
    }),
    prisma.saleReturn.groupBy({
      by: ['customerId'],
      where,
      _sum: { total: true, cashRefund: true },
    }),
  ]);

  const saleBy = new Map(sales.map((r) => [r.customerId, r._sum] as const));
  const paymentBy = new Map(
    payments.map((r) => [r.customerId, r._sum] as const),
  );
  const returnBy = new Map(returns.map((r) => [r.customerId, r._sum] as const));

  for (const c of customers) {
    const totalSales = sum(saleBy.get(c.id)?.total);
    const paidAtSale = sum(saleBy.get(c.id)?.paid);
    const paidLater = sum(paymentBy.get(c.id)?.amount);
    const returned = sum(returnBy.get(c.id)?.total);
    const cashBack = sum(returnBy.get(c.id)?.cashRefund);

    result.set(c.id, {
      openingBalance: c.openingBalance,
      totalSales,
      totalReturns: returned,
      netSales: totalSales.sub(returned),
      totalPaid: paidAtSale.add(paidLater),
      remaining: c.openingBalance
        .add(totalSales)
        .sub(paidAtSale)
        .sub(paidLater)
        .sub(returned)
        .add(cashBack),
    });
  }
  return result;
}

export async function createCustomer(input: CreateCustomerInput) {
  await isNameUnique(input.name);
  return prisma.customer.create({
    data: {
      name: input.name,
      phone: input.phone,
      openingBalance: input.openingBalance,
    },
  });
}

export async function updateCustomer(id: number, input: UpdateCustomerInput) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new appError('Customer not found', 404);

  if (
    input.name !== undefined &&
    input.name.toLowerCase() !== customer.name.toLowerCase()
  ) {
    await isNameUnique(input.name);
  }

  return prisma.customer.update({
    where: { id },
    data: {
      name: input.name,
      phone: input.phone,
      openingBalance: input.openingBalance,
    },
  });
}

export async function setCustomerStatus(id: number, isActive: boolean) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new appError('Customer not found', 404);

  return prisma.customer.update({ where: { id }, data: { isActive } });
}

export async function listCustomers(q: ListCustomersQuery) {
  const where: Prisma.CustomerWhereInput = {};
  if (q.search) {
    where.OR = [
      { name: { contains: q.search, mode: 'insensitive' } },
      { phone: { contains: q.search } },
    ];
  }
  if (q.active !== 'all') where.isActive = q.active === 'true';

  if (q.debtors) {
    const candidates = await prisma.customer.findMany({
      where,
      select: { id: true, openingBalance: true },
    });
    const sums = await summariesFor(candidates);
    where.id = {
      in: candidates
        .filter((c) => sums.get(c.id)!.remaining.gt(0))
        .map((c) => c.id),
    };
  }

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
  ]);

  const sums = await summariesFor(customers);
  return {
    customers: customers.map((c) => ({ ...c, ...sums.get(c.id)! })),
    total,
  };
}
