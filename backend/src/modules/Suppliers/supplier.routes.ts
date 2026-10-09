import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import { createSupplier } from './supplier.controller';
import { createSupplierSchema } from './supplier.validation';

const router = Router();

router.use(protect);

router.post(
  '/',
  validateRequest({ body: createSupplierSchema }),
  createSupplier,
);

export default router;
