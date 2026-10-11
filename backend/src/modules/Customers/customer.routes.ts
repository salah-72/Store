import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import { createCustomerSchema } from './customer.validation';
import { createCustomer } from './customer.controller';

const router = Router();

router.use(protect);

router.post(
  '/',
  validateRequest({ body: createCustomerSchema }),
  createCustomer,
);

export default router;
