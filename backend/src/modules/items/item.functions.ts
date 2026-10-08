import appError from '@/common/utils/appError';
import { prisma } from '@/config/postgres';
import { StockUnit } from '@prisma/client';

export const isNameUnique = async (name: string) => {
  const existingItem = await prisma.item.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive',
      },
    },
  });
  if (existingItem) throw new appError('Item name must be unique', 400);
};

export const resolveShape = (i: {
  unit: StockUnit;
  packName?: string | null;
  packSize?: number | null;
}) => {
  const priceBasis = i.unit === 'PIECE' ? 1 : 1000;

  const packName = i.packName?.trim() || null;
  const packSize = i.packSize ?? null;
  //   if ((packName === null) !== (packSize === null)) {
  //     throw new appError(
  //       'Both pack name and size must be provided together',
  //       400,
  //     );
  //   }

  return { priceBasis, packName, packSize };
};
