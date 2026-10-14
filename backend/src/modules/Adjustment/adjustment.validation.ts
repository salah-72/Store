import { z } from 'zod';
import { pagination, ymd } from '../../common/utils/schemas';
import { ADJUSTMENT_REASON } from '@/common/utils/date';

const positiveInt = z.coerce.number().int().positive();
const reason = z.string().trim().min(1, 'Reason is required').max(150);

export const createAdjustmentSchema = z
  .object({
    batchId: positiveInt,
    baseQty: positiveInt.max(2_000_000_000),
    reason: reason.default(ADJUSTMENT_REASON.DAMAGED),
    date: ymd.optional(),
  })
  .strict();

export const updateAdjustmentSchema = z
  .object({ reason: reason.optional(), date: ymd.optional() })
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: 'Nothing to update' });

export const listAdjustmentsQuery = pagination
  .extend({
    itemId: positiveInt.optional(),
    batchId: positiveInt.optional(),
    reason: z.string().trim().max(100).optional(),
    from: ymd.optional(),
    to: ymd.optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: '"from" must not be after "to"',
    path: ['from'],
  });

export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>;
export type UpdateAdjustmentInput = z.infer<typeof updateAdjustmentSchema>;
export type ListAdjustmentsQuery = z.infer<typeof listAdjustmentsQuery>;
