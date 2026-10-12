import { prisma } from '@/config/postgres';
import appError from '@/common/utils/appError';

export async function getSaleReturn(id: number) {
  const r = await prisma.saleReturn.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true } },
      sale: { select: { id: true, date: true, total: true } },
      lines: {
        orderBy: { id: 'asc' },
        include: {
          item: { select: { id: true, name: true, unit: true } },
          batch: { select: { id: true, expiryDate: true } },
        },
      },
    },
  });
  if (!r) throw new appError('Sale return not found', 404);
  return r;
}
