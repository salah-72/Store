import { prisma } from '@/config/postgres';
import {
  CreateSupplierInput,
  ListSuppliersQuery,
  UpdateSupplierInput,
} from './supplier.validation';
import appError from '@/common/utils/appError';
import { Prisma } from '@prisma/client';

const ZERO = new Prisma.Decimal(0);
const sum = (v: Prisma.Decimal | null | undefined) => v ?? ZERO;

async function isNameUnique(name: string) {
  const existingName = await prisma.supplier.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
    },
  });
  if (existingName)
    throw new appError('A supplier with this name already exists', 400);
}

async function summariesFor(
  suppliers: { id: number; openingBalance: Prisma.Decimal }[],
) {
  const result = new Map<
    number,
    {
      openingBalance: Prisma.Decimal;
      totalPurchases: Prisma.Decimal;
      totalReturns: Prisma.Decimal;
      netPurchases: Prisma.Decimal;
      totalPaid: Prisma.Decimal;
      remaining: Prisma.Decimal;
    }
  >();
  if (suppliers.length === 0) return result;

  const where = { supplierId: { in: suppliers.map((s) => s.id) } };
  const [purchases, payments, returns] = await Promise.all([
    prisma.purchase.groupBy({
      by: ['supplierId'],
      where,
      _sum: { total: true, paid: true },
    }),
    prisma.payment.groupBy({
      by: ['supplierId'],
      where,
      _sum: { amount: true },
    }),
    prisma.purchaseReturn.groupBy({
      by: ['supplierId'],
      where,
      _sum: { total: true, cashRefund: true },
    }),
  ]);

  const purchaseBy = new Map(
    purchases.map((r) => [r.supplierId, r._sum] as const),
  );
  const paymentBy = new Map(
    payments.map((r) => [r.supplierId, r._sum] as const),
  );
  const returnBy = new Map(returns.map((r) => [r.supplierId, r._sum] as const));

  for (const s of suppliers) {
    const totalPurchases = sum(purchaseBy.get(s.id)?.total);
    const paidAtPurchase = sum(purchaseBy.get(s.id)?.paid);
    const paidLater = sum(paymentBy.get(s.id)?.amount);
    const returned = sum(returnBy.get(s.id)?.total);
    const cashBack = sum(returnBy.get(s.id)?.cashRefund);

    result.set(s.id, {
      openingBalance: s.openingBalance,
      totalPurchases,
      totalReturns: returned,
      netPurchases: totalPurchases.sub(returned),
      totalPaid: paidAtPurchase.add(paidLater),
      remaining: s.openingBalance
        .add(totalPurchases)
        .sub(paidAtPurchase)
        .sub(paidLater)
        .sub(returned)
        .add(cashBack),
    });
  }
  return result;
}

export async function createSupplierService(input: CreateSupplierInput) {
  await isNameUnique(input.name);
  return await prisma.supplier.create({
    data: {
      name: input.name,
      phone: input.phone,
      openingBalance: input.openingBalance,
    },
  });
}

export async function updateSupplierService(
  id: number,
  input: UpdateSupplierInput,
) {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
  });

  if (!supplier) {
    throw new appError('Supplier not found', 404);
  }

  if (
    input.name !== undefined &&
    input.name.toLowerCase() !== supplier.name.toLowerCase()
  ) {
    await isNameUnique(input.name);
  }

  return prisma.supplier.update({
    where: { id },
    data: {
      name: input.name,
      phone: input.phone,
      openingBalance: input.openingBalance,
    },
  });
}

export async function setSupplierStatusService(id: number, isActive: boolean) {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
  });

  if (!supplier) {
    throw new appError('Supplier not found', 404);
  }

  return prisma.supplier.update({
    where: { id },
    data: {
      isActive,
    },
  });
}

export async function listSuppliers(q: ListSuppliersQuery) {
  console.log('QUERY:', q);

  const where: Prisma.SupplierWhereInput = {};
  if (q.search) {
    where.OR = [
      { name: { contains: q.search, mode: 'insensitive' } },
      { phone: { contains: q.search } },
    ];
  }
  if (q.active !== 'all') where.isActive = q.active === 'true';

  if (q.owed) {
    const candidates = await prisma.supplier.findMany({
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

  console.log('WHERE:', where);
  const [total, suppliers] = await Promise.all([
    prisma.supplier.count({ where }),
    prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
  ]);

  console.log('TOTAL:', total);
  console.log('SUPPLIERS:', suppliers);

  const sums = await summariesFor(suppliers);
  return {
    suppliers: suppliers.map((s) => ({ ...s, ...sums.get(s.id)! })),
    total,
  };
}
