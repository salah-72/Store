import { z } from 'zod';
import { money, pagination, ymd } from '../../common/utils/schemas';

const positiveInt = z.coerce.number().int().positive();
const qty = z.coerce.number().int().positive().max(2_000_000_000);

const invoiceLine = z
  .object({ purchaseLineId: positiveInt, baseQty: qty })
  .strict();

export const createPurchaseReturnSchema = z
  .object({
    purchaseId: positiveInt,
    date: ymd.optional(),
    note: z.string().trim().max(500).nullable().optional(),
    cashRefund: money.optional(),
    lines: z
      .array(invoiceLine)
      .min(1, 'At least one line is required')
      .max(100),
  })
  .strict();

export const updatePurchaseReturnSchema = z
  .object({
    date: ymd.optional(),
    note: z.string().trim().max(500).nullable().optional(),
    cashRefund: money.optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: 'Nothing to update' });

export type InvoiceLineInput = z.infer<typeof invoiceLine>;
export type CreatePurchaseReturnInput = z.infer<
  typeof createPurchaseReturnSchema
>;
export type UpdatePurchaseReturnInput = z.infer<
  typeof updatePurchaseReturnSchema
>;
