import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import { createAdjustmentSchema } from './adjustment.validation';
import { create } from './adjustment.controller';

const router = Router();

router.use(protect);

router.use('/', validateRequest({ body: createAdjustmentSchema }), create);

export default router;
