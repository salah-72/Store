import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import {
  createCustomerSchema,
  updateCustomerSchema,
} from './customer.validation';
import { createCustomer, update } from './customer.controller';
import { idParam } from '../Suppliers/supplier.validation';

const router = Router();

router.use(protect);

router.post(
  '/',
  validateRequest({ body: createCustomerSchema }),
  createCustomer,
);
router.patch(
  '/:id',
  validateRequest({ params: idParam, body: updateCustomerSchema }),
  update,
);

export default router;
