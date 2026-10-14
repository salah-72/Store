import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import { idParam } from '../Suppliers/supplier.validation';
import { create, getOne, remove, update } from './purchase-return.controller';
import {
  createPurchaseReturnSchema,
  updatePurchaseReturnSchema,
} from './purchase-return.validation';

const router = Router();

router.use(protect);

router.post('/', validateRequest({ body: createPurchaseReturnSchema }), create);
router.get('/:id', validateRequest({ params: idParam }), getOne);
router.patch(
  '/:id',
  validateRequest({ params: idParam, body: updatePurchaseReturnSchema }),
  update,
);
router.delete('/:id', validateRequest({ params: idParam }), remove);

export default router;
