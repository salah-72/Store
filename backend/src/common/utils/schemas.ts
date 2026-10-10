import { z } from 'zod';

export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const pageMeta = (total: number, page: number, limit: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

const round2 = (v: number) => Math.round(v * 100) / 100;

export const money = z.coerce
  .number()
  .min(0)
  .max(9_999_999.99)
  .transform(round2);

export const signedMoney = z.coerce
  .number()
  .min(-9_999_999.99)
  .max(9_999_999.99)
  .transform(round2);

export const ymd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine((v) => {
    const t = Date.parse(`${v}T00:00:00Z`);
    return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === v;
  }, 'Invalid date');

export const phone = z.string().trim().max(30);
