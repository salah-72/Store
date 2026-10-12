import { z } from 'zod';
import {
  phone,
  pagination,
  signedMoney,
  ymd,
} from '../../common/utils/schemas';

const name = z.string().trim().min(1, 'Name is required').max(150);

const fields = {
  name,
  phone,
  openingBalance: signedMoney,
};

export const createCustomerSchema = z
  .object({
    ...fields,
    phone: phone.default(''),
    openingBalance: signedMoney.default(0),
  })
  .strict();

export const updateCustomerSchema = z
  .object(fields)
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: 'Nothing to update' });

export const setCustomerStatusSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export const listCustomersQuery = pagination.extend({
  search: z.string().trim().max(100).optional(),
  active: z.enum(['true', 'false', 'all']).default('true'),
  debtors: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type SetCustomerStatusInput = z.infer<typeof setCustomerStatusSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuery>;
