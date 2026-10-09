import * as z from 'zod';
import { phone, signedMoney } from '../../common/utils/schemas';

const name = z.string().trim().min(1, 'Name is required').max(100);

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

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
