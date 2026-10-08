import { CreateItemInput } from './item.validation';
import { isNameUnique, resolveShape } from './item.functions';
import { prisma } from '@/config/postgres';

export async function createItem(input: CreateItemInput) {
  await isNameUnique(input.name);
  const shape = resolveShape(input);

  return prisma.item.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      unit: input.unit,
      price: input.price,
      reorderLevel: input.reorderLevel,
      ...shape,
    },
  });
}
