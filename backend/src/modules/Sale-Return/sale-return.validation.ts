import { z } from 'zod';
import { money, pagination, ymd } from '../../common/utils/schemas';

const positiveInt = z.coerce.number().int().positive();
const qty = z.coerce.number().int().positive().max(2_000_000_000); // in the item's own unit (pieces / g / ml)

const invoiceLine = z
  .object({
    saleLineId: positiveInt,
    baseQty: qty,
    lineTotal: money.optional(),
  })
  .strict();

export const createSaleReturnSchema = z
  .object({
    saleId: positiveInt,
    date: ymd.optional(),
    note: z.string().trim().max(500).nullable().optional(),
    cashRefund: money.optional(),
    lines: z
      .array(invoiceLine)
      .min(1, 'At least one line is required')
      .max(100),
  })
  .strict();

export const updateSaleReturnSchema = z
  .object({
    date: ymd.optional(),
    note: z.string().trim().max(500).nullable().optional(),
    cashRefund: money.optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: 'Nothing to update' });

export const listSaleReturnsQuery = pagination
  .extend({
    customerId: positiveInt.optional(),
    saleId: positiveInt.optional(),
    from: ymd.optional(),
    to: ymd.optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: '"from" must not be after "to"',
    path: ['from'],
  });

export const saleIdParam = z.object({ saleId: positiveInt });

export type InvoiceLineInput = z.infer<typeof invoiceLine>;
export type CreateSaleReturnInput = z.infer<typeof createSaleReturnSchema>;
export type UpdateSaleReturnInput = z.infer<typeof updateSaleReturnSchema>;
export type ListSaleReturnsQuery = z.infer<typeof listSaleReturnsQuery>;
