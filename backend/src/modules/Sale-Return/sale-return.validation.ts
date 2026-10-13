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

export type InvoiceLineInput = z.infer<typeof invoiceLine>;
export type CreateSaleReturnInput = z.infer<typeof createSaleReturnSchema>;
