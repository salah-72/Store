import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import {
  createPurchaseSchema,
  updatePurchaseSchema,
} from './purchase.validation';
import {
  createPurchase,
  getPurchase,
  updatePurchase,
} from './purchase.controller';
import { idParam } from '../Suppliers/supplier.validation';

const router = Router();

router.use(protect);

router.post(
  '/',
  validateRequest({ body: createPurchaseSchema }),
  createPurchase,
);
router.get('/:id', validateRequest({ params: idParam }), getPurchase);
router.patch(
  '/:id',
  validateRequest({ params: idParam, body: updatePurchaseSchema }),
  updatePurchase,
);
export default router;
