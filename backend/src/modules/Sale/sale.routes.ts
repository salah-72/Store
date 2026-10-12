import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import {
  createSaleSchema,
  listSalesQuery,
  updateSaleSchema,
} from './sale.validation';
import { create, getSale, remove, update, list } from './sale.controller';
import { idParam } from '../Suppliers/supplier.validation';

const router = Router();

router.use(protect);

router.get('/', validateRequest({ query: listSalesQuery }), list);
router.post('/', validateRequest({ body: createSaleSchema }), create);
router.get('/:id', validateRequest({ params: idParam }), getSale);
router.patch(
  '/:id',
  validateRequest({ params: idParam, body: updateSaleSchema }),
  update,
);
router.delete('/:id', validateRequest({ params: idParam }), remove);
export default router;
