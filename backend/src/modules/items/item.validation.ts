import * as z from 'zod';

const fields = {
  name: z.string().trim().min(1, 'Name is required').max(150),
  description: z.string().trim().max(500).nullable().optional(),
  unit: z.enum(['PIECE', 'GRAM', 'ML']),
  price: z.coerce
    .number()
    .min(0)
    .max(9_999_999.99)
    .transform((v) => Math.round(v * 100) / 100),
  packName: z.string().trim().max(50).nullable().optional(),
  packSize: z.coerce.number().int().min(1).nullable().optional(),
  reorderLevel: z.coerce.number().int().min(0),
};

export const itemIdParam = z.object({
  id: z.coerce.number().int().min(1),
});

export const createItemSchema = z
  .object({
    ...fields,
    reorderLevel: fields.reorderLevel.default(0),
  })
  .strict();

export const updateItemSchema = z
  .object(fields)
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: 'Nothing to update' });

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
