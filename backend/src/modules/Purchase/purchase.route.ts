import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import {
  createPurchaseSchema,
  listPurchasesQuery,
  updatePurchaseSchema,
} from './purchase.validation';
import {
  createPurchase,
  getPurchase,
  listPurchases,
  updatePurchase,
} from './purchase.controller';
import { idParam } from '../Suppliers/supplier.validation';

const router = Router();

router.use(protect);

router.get('/', validateRequest({ query: listPurchasesQuery }), listPurchases);
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
