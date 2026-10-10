import * as z from 'zod';
import {
  pagination,
  phone,
  signedMoney,
  ymd,
} from '../../common/utils/schemas';

const name = z.string().trim().min(1, 'Name is required').max(100);

export const idParam = z.object({ id: z.coerce.number().int().min(1) });

const fields = {
  name,
  phone,
  openingBalance: signedMoney,
};

export const createSupplierSchema = z
  .object({
    ...fields,
    phone: phone.default(''),
    openingBalance: signedMoney.default(0),
  })
  .strict();

export const updateSupplierSchema = z
  .object(fields)
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: 'Nothing to update' });

export const setSupplierStatusSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export const listSuppliersQuery = pagination.extend({
  search: z.string().trim().max(100).optional(),
  active: z.enum(['true', 'false', 'all']).default('true'),
  owed: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export const statementQuery = z
  .object({ from: ymd.optional(), to: ymd.optional() })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: '"from" must not be after "to"',
    path: ['from'],
  });

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type setSupplierStatusInput = z.infer<typeof setSupplierStatusSchema>;
export type ListSuppliersQuery = z.infer<typeof listSuppliersQuery>;
export type StatementQuery = z.infer<typeof statementQuery>;
