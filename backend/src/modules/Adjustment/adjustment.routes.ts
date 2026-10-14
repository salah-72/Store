import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import { createAdjustmentSchema } from './adjustment.validation';
import { create, getOne } from './adjustment.controller';
import { idParam } from '../Suppliers/supplier.validation';

const router = Router();

router.use(protect);

router.post('/', validateRequest({ body: createAdjustmentSchema }), create);
router.get('/:id', validateRequest({ params: idParam }), getOne);

export default router;
