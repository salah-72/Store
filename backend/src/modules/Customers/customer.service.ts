import { prisma } from '@/config/postgres';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
} from './customer.validation';
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
