import { ymd } from '@/common/utils/schemas';
import { z } from 'zod';

const days = (from: string, to: string) =>
  (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
    86_400_000 +
  1;
const fromBeforeTo = {
  message: '"from" must not be after "to"',
  path: ['from'],
};

export const overviewQuery = z
  .object({ from: ymd.optional(), to: ymd.optional() })
  .refine((q) => !q.from || !q.to || q.from <= q.to, fromBeforeTo);

export const salesByDayQuery = z
  .object({ from: ymd.optional(), to: ymd.optional() })
  .refine((q) => !q.from || !q.to || q.from <= q.to, fromBeforeTo)
  .refine((q) => !q.from || !q.to || days(q.from, q.to) <= 366, {
    message: 'The range can not be longer than 366 days',
    path: ['to'],
  });

export type OverviewQuery = z.infer<typeof overviewQuery>;
export type SalesByDayQuery = z.infer<typeof salesByDayQuery>;
