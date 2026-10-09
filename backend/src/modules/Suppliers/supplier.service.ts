import { prisma } from '@/config/postgres';
import {
  CreateSupplierInput,
  UpdateSupplierInput,
} from './supplier.validation';
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
