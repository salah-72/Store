import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import { createSaleSchema } from './sale.validation';
import { create, getSale } from './sale.controller';
import { idParam } from '../Suppliers/supplier.validation';

const router = Router();

router.use(protect);

router.post('/', validateRequest({ body: createSaleSchema }), create);
router.get('/:id', validateRequest({ params: idParam }), getSale);
export default router;
