import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import {
  createPaymentSchema,
  updatePaymentSchema,
  listPaymentsQuery,
} from './payment.validation';
import { create, getOne, remove, update, list } from './payment.controller';
import { idParam } from '../Suppliers/supplier.validation';

const router = Router();

router.use(protect);

router.get('/', validateRequest({ query: listPaymentsQuery }), list);
router.post('/', validateRequest({ body: createPaymentSchema }), create);
router.get('/:id', validateRequest({ params: idParam }), getOne);
router.patch(
  '/:id',
  validateRequest({ params: idParam, body: updatePaymentSchema }),
  update,
);
router.delete('/:id', validateRequest({ params: idParam }), remove);

export default router;
