import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import { createSaleSchema } from './sale.validation';
import { create } from './sale.controller';

const router = Router();

router.use(protect);

router.post('/', validateRequest({ body: createSaleSchema }), create);

export default router;
