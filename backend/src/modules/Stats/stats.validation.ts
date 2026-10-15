import { ymd } from '@/common/utils/schemas';
import { z } from 'zod';

const fromBeforeTo = {
  message: '"from" must not be after "to"',
  path: ['from'],
};

export const overviewQuery = z
  .object({ from: ymd.optional(), to: ymd.optional() })
  .refine((q) => !q.from || !q.to || q.from <= q.to, fromBeforeTo);

export type OverviewQuery = z.infer<typeof overviewQuery>;
