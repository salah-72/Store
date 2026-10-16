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

export const dashboardQuery = z.object({
  expiryDays: z.coerce.number().int().min(1).max(365).default(60), // "near expiry" = expires within this many days
});

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

export const topItemsQuery = z
  .object({
    from: ymd.optional(),
    to: ymd.optional(),
    by: z.enum(['revenue', 'quantity']).default('revenue'),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, fromBeforeTo);

export const staleStockQuery = z.object({
  days: z.coerce.number().int().min(7).max(730).default(90),
  limit: z.coerce.number().int().min(1).max(200).default(30),
});

export type DashboardQuery = z.infer<typeof dashboardQuery>;
export type OverviewQuery = z.infer<typeof overviewQuery>;
export type SalesByDayQuery = z.infer<typeof salesByDayQuery>;
export type TopItemsQuery = z.infer<typeof topItemsQuery>;
export type StaleStockQuery = z.infer<typeof staleStockQuery>;
