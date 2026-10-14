import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import { createPaymentSchema } from './payment.validation';
import { create } from './payment.controller';

const router = Router();

router.use(protect);

router.post('/', validateRequest({ body: createPaymentSchema }), create);

export default router;
