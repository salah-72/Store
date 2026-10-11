import { money, ymd } from '@/common/utils/schemas';
import { z } from 'zod';

const positiveInt = z.coerce.number().int().positive();

export const purchaseLineSchema = z
  .object({
    itemId: positiveInt,
    packs: z.coerce.number().positive().max(1_000_000).optional(),
    baseQty: z.coerce.number().int().positive().max(2_000_000_000).optional(),
    lineTotal: money,
    expiryDate: ymd
      .refine((v) => v <= '2100-12-31', 'Expiry date is too far in the future')
      .nullable(),
  })
  .strict()
  .refine((l) => (l.packs === undefined) !== (l.baseQty === undefined), {
    message: 'Send either "packs" or "baseQty" (not both)',
    path: ['packs'],
  });

export const createPurchaseSchema = z
  .object({
    supplierId: positiveInt,
    date: ymd.optional(),
    note: z.string().trim().max(500).nullable().optional(),
    paid: money.default(0),
    discount: money.default(0),
    lines: z
      .array(purchaseLineSchema)
      .min(1, 'At least one line is required')
      .max(100),
  })
  .strict();

export type PurchaseLineInput = z.infer<typeof purchaseLineSchema>;
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
