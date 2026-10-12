import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import { idParam } from '../Suppliers/supplier.validation';
import { getSaleReturn } from './sale-return.controller';

const router = Router();

router.use(protect);

router.get('/:id', validateRequest({ params: idParam }), getSaleReturn);

export default router;
