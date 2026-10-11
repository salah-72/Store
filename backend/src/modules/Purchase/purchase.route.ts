import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import { createPurchaseSchema } from './purchase.validation';
import { createPurchase, getPurchase } from './purchase.controller';
import { idParam } from '../Suppliers/supplier.validation';

const router = Router();

router.use(protect);

router.post(
  '/',
  validateRequest({ body: createPurchaseSchema }),
  createPurchase,
);
router.get('/:id', validateRequest({ params: idParam }), getPurchase);

export default router;
