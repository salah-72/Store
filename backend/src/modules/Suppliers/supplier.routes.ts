import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import {
  createSupplier,
  setSupplierStatus,
  updateSupplier,
} from './supplier.controller';
import {
  createSupplierSchema,
  updateSupplierSchema,
  idParam,
  setSupplierStatusSchema,
} from './supplier.validation';

const router = Router();

router.use(protect);

router.post(
  '/',
  validateRequest({ body: createSupplierSchema }),
  createSupplier,
);
router.patch(
  '/:id',
  validateRequest({ params: idParam, body: updateSupplierSchema }),
  updateSupplier,
);
router.patch(
  '/:id/status',
  validateRequest({ params: idParam, body: setSupplierStatusSchema }),
  setSupplierStatus,
);

export default router;
