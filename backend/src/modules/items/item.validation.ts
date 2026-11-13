import * as z from 'zod';
import { pagination, ymd } from '../../common/utils/schemas';

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

export const setItemStatusSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export const listItemsQuery = pagination.extend({
  search: z.string().trim().max(100).optional(),
  unit: z.enum(['PIECE', 'GRAM', 'ML']).optional(),
  active: z.enum(['true', 'false', 'all']).default('true'),
  lowStock: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type SetItemStatusInput = z.infer<typeof setItemStatusSchema>;
export type ListItemsQuery = z.infer<typeof listItemsQuery>;

// سجل مبيعات صنف: سطور الفواتير اللي اتباع فيها، بفلتر تاريخ اختياري
export const itemSalesQuery = pagination
  .extend({
    from: ymd.optional(),
    to: ymd.optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: '"from" must not be after "to"',
    path: ['from'],
  });

export type ItemSalesQuery = z.infer<typeof itemSalesQuery>;
