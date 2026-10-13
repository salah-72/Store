import appError from '@/common/utils/appError';
import { prisma } from '@/config/postgres';

export async function getPurchaseReturn(id: number) {
  const r = await prisma.purchaseReturn.findUnique({
    where: { id },
    include: {
      supplier: { select: { id: true, name: true } },
      purchase: { select: { id: true, date: true, total: true } },
      lines: {
        orderBy: { id: 'asc' },
        include: {
          item: { select: { id: true, name: true, unit: true } },
          batch: { select: { id: true, expiryDate: true, qtyRemaining: true } },
        },
      },
    },
  });
  if (!r) throw new appError('Purchase return not found', 404);
  return r;
}
