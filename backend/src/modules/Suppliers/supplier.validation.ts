import * as z from 'zod';
import { phone, signedMoney } from '../../common/utils/schemas';

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

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
