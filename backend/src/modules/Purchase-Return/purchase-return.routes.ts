import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import { idParam } from '../Suppliers/supplier.validation';
import { create, getOne } from './purchase-return.controller';
import { createPurchaseReturnSchema } from './purchase-return.validation';

const router = Router();

router.use(protect);

router.post('/', validateRequest({ body: createPurchaseReturnSchema }), create);
router.get('/:id', validateRequest({ params: idParam }), getOne);

export default router;
