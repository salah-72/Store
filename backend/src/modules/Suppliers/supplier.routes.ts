import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import {
  createSupplier,
  getSupplier,
  getSupplierList,
  setSupplierStatus,
  statement,
  updateSupplier,
} from './supplier.controller';
import {
  createSupplierSchema,
  updateSupplierSchema,
  idParam,
  setSupplierStatusSchema,
  listSuppliersQuery,
  statementQuery,
} from './supplier.validation';

const router = Router();

router.use(protect);

router.get(
  '/',
  validateRequest({ query: listSuppliersQuery }),
  getSupplierList,
);
router.post(
  '/',
  validateRequest({ body: createSupplierSchema }),
  createSupplier,
);
router.get('/:id', validateRequest({ params: idParam }), getSupplier);
router.get(
  '/:id/statement',
  validateRequest({ params: idParam, query: statementQuery }),
  statement,
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
