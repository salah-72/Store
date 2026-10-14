import { z } from 'zod';
import { pagination, ymd } from '../../common/utils/schemas';
import { ADJUSTMENT_REASON } from '@/common/utils/date';

const positiveId = z.coerce.number().int().positive();
const reason = z.string().trim().min(1, 'Reason is required').max(150);

export const createAdjustmentSchema = z
  .object({
    batchId: positiveId,
    baseQty: positiveId.max(2_000_000_000),
    reason: reason.default(ADJUSTMENT_REASON.DAMAGED),
    date: ymd.optional(),
  })
  .strict();

export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>;
