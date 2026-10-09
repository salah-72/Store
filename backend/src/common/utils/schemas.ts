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

export const phone = z.string().trim().max(30);
