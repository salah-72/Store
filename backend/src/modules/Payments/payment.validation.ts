import { z } from 'zod';
import { money, pagination, ymd } from '../../common/utils/schemas';

const positiveInt = z.coerce.number().int().positive();
const amount = money.refine((v) => v > 0, 'Amount must be greater than zero');

export const createPaymentSchema = z
  .object({
    customerId: positiveInt.optional(),
    supplierId: positiveInt.optional(),
    amount,
    date: ymd.optional(),
    note: z.string().trim().max(500).nullable().optional(),
  })
  .strict()
  .refine(
    (v) => (v.customerId === undefined) !== (v.supplierId === undefined),
    {
      message: 'Send exactly one of customerId or supplierId',
      path: ['customerId'],
    },
  );

export const updatePaymentSchema = z
  .object({
    amount: amount.optional(),
    date: ymd.optional(),
    note: z.string().trim().max(500).nullable().optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: 'Nothing to update' });

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
