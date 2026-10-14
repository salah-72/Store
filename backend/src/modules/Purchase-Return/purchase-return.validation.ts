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

export const listPurchaseReturnsQuery = pagination
  .extend({
    supplierId: positiveInt.optional(),
    purchaseId: positiveInt.optional(),
    from: ymd.optional(),
    to: ymd.optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: '"from" must not be after "to"',
    path: ['from'],
  });

export const purchaseIdParam = z.object({ purchaseId: positiveInt });

export type InvoiceLineInput = z.infer<typeof invoiceLine>;
export type CreatePurchaseReturnInput = z.infer<
  typeof createPurchaseReturnSchema
>;
export type UpdatePurchaseReturnInput = z.infer<
  typeof updatePurchaseReturnSchema
>;
export type ListPurchaseReturnsQuery = z.infer<typeof listPurchaseReturnsQuery>;
