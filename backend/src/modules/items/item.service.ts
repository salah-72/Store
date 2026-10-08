import { CreateItemInput, UpdateItemInput } from './item.validation';
import { isNameUnique, resolveShape } from './item.functions';
import { prisma } from '@/config/postgres';
import appError from '@/common/utils/appError';

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

export async function updateItem(id: number, input: UpdateItemInput) {
  const current = await prisma.item.findUnique({ where: { id } });
  if (!current) throw new appError('Item not found', 404);

  const unit = input.unit ?? current.unit;
  const unitChanged = unit !== current.unit;
  if (
    unitChanged &&
    (await prisma.batch.count({ where: { itemId: id } })) > 0
  ) {
    throw new appError(
      'Unit cannot be changed after the item has stock movements',
      409,
    );
  }

  const shape = resolveShape({
    unit,
    packName: input.packName !== undefined ? input.packName : current.packName,
    packSize: input.packSize !== undefined ? input.packSize : current.packSize,
  });

  if (
    input.name !== undefined &&
    input.name.toLowerCase() !== current.name.toLowerCase()
  )
    await isNameUnique(input.name);

  return prisma.item.update({
    where: { id },
    data: {
      name: input.name,
      description:
        input.description === undefined ? undefined : input.description,
      unit,
      price: input.price,
      reorderLevel: input.reorderLevel,
      ...shape,
    },
  });
}

export async function setItemStatus(id: number, isActive: boolean) {
  const current = await prisma.item.findUnique({ where: { id } });
  if (!current) throw new appError('Item not found', 404);

  return prisma.item.update({
    where: { id },
    data: { isActive },
  });
}
