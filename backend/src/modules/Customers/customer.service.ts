import { prisma } from '@/config/postgres';
import { CreateCustomerInput } from './customer.validation';
import appError from '@/common/utils/appError';

async function isNameUnique(name: string) {
  const existingName = await prisma.customer.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
    },
  });
  if (existingName)
    throw new appError('A customer with this name already exists', 400);
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
