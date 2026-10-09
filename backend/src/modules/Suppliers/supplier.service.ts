import { prisma } from '@/config/postgres';
import { CreateSupplierInput } from './supplier.validation';
import appError from '@/common/utils/appError';

async function isNameUnique(name: string) {
  const existingName = await prisma.supplier.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
    },
  });
  if (existingName)
    throw new appError('A supplier with this name already exists', 400);
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
