import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import { createPaymentSchema, updatePaymentSchema } from './payment.validation';
import { create, getOne, update } from './payment.controller';
import { idParam } from '../Suppliers/supplier.validation';

const router = Router();

router.use(protect);

router.post('/', validateRequest({ body: createPaymentSchema }), create);
router.get('/:id', validateRequest({ params: idParam }), getOne);
router.patch(
  '/:id',
  validateRequest({ params: idParam, body: updatePaymentSchema }),
  update,
);
export default router;
