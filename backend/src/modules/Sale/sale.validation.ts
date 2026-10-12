import { z } from 'zod';
import { money, pagination, ymd } from '../../common/utils/schemas';

const positiveInt = z.coerce.number().int().positive();

export const saleLineSchema = z
  .object({
    itemId: positiveInt,
    baseQty: z.coerce.number().int().positive().max(2_000_000_000),
    price: money.optional(),
    lineTotal: money.optional(),
  })
  .strict()
  .refine((l) => l.price === undefined || l.lineTotal === undefined, {
    message: 'Send either "price" or "lineTotal", not both',
    path: ['price'],
  });

export const createSaleSchema = z
  .object({
    customerId: positiveInt.nullable().optional(),
    date: ymd.optional(),
    note: z.string().trim().max(500).nullable().optional(),
    discount: money.default(0),
    paid: money.optional(),
    lines: z
      .array(saleLineSchema)
      .min(1, 'At least one line is required')
      .max(100),
  })
  .strict();

export type SaleLineInput = z.infer<typeof saleLineSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
