import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import { createPurchaseSchema } from './purchase.validation';
import { createPurchase } from './purchase.controller';

const router = Router();

router.use(protect);

router.post(
  '/',
  validateRequest({ body: createPurchaseSchema }),
  createPurchase,
);

export default router;
