import { prisma } from '@/config/postgres';
import { CreatePaymentInput, UpdatePaymentInput } from './payment.validation';
import appError from '@/common/utils/appError';
import { cairoDay, cairoToday, resolveDocDate } from '@/common/utils/date';
import { getCustomer } from '../Customers/customer.service';
import { getSupplier } from '../Suppliers/supplier.service';

const directionOf = (p: { customerId: number | null }) =>
  p.customerId !== null
    ? ({ type: 'CUSTOMER', direction: 'IN' } as const)
    : ({ type: 'SUPPLIER', direction: 'OUT' } as const);

export async function getPayment(id: number) {
  const row = await prisma.payment.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      supplier: { select: { id: true, name: true, phone: true } },
    },
  });
  if (!row) throw new appError('Payment not found', 404);

  const { customer, supplier, ...p } = row;
  const currentBalance =
    p.customerId !== null
      ? (await getCustomer(p.customerId)).remaining
      : (await getSupplier(p.supplierId as number)).remaining;

  return {
    ...p,
    ...directionOf(row),
    party: customer ?? supplier,
    currentBalance,
    hasCredit: currentBalance.lt(0),
  };
}

export async function createPayment(input: CreatePaymentInput) {
  if (input.customerId !== undefined) {
    const c = await prisma.customer.findUnique({
      where: { id: input.customerId },
      select: { id: true },
    });
    if (!c) throw new appError('Customer not found', 404);
  } else {
    const s = await prisma.supplier.findUnique({
      where: { id: input.supplierId as number },
      select: { id: true },
    });
    if (!s) throw new appError('Supplier not found', 404);
  }

  const payment = await prisma.payment.create({
    data: {
      customerId: input.customerId ?? null,
      supplierId: input.supplierId ?? null,
      amount: input.amount,
      date: resolveDocDate(input.date, cairoToday(), 'Payment date'),
      note: input.note?.trim() || null,
    },
  });
  return getPayment(payment.id);
}

export async function updatePayment(id: number, input: UpdatePaymentInput) {
  const current = await prisma.payment.findUnique({
    where: { id },
    select: { date: true },
  });
  if (!current) throw new appError('Payment not found', 404);

  await prisma.payment.update({
    where: { id },
    data: {
      amount: input.amount,
      note: input.note === undefined ? undefined : input.note?.trim() || null,
      date:
        input.date && input.date !== cairoDay(current.date)
          ? resolveDocDate(input.date, cairoToday(), 'Payment date')
          : undefined,
    },
  });
  return getPayment(id);
}
