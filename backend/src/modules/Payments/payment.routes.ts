import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import { createPaymentSchema } from './payment.validation';
import { create, getOne } from './payment.controller';
import { idParam } from '../Suppliers/supplier.validation';

const router = Router();

router.use(protect);

router.post('/', validateRequest({ body: createPaymentSchema }), create);
router.get('/:id', validateRequest({ params: idParam }), getOne);

export default router;
