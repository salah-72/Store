import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import { idParam } from '../Suppliers/supplier.validation';
import {
  create,
  getSaleReturn,
  list,
  remove,
  update,
} from './sale-return.controller';
import {
  createSaleReturnSchema,
  listSaleReturnsQuery,
  updateSaleReturnSchema,
} from './sale-return.validation';

const router = Router();

router.use(protect);

router.get('/', validateRequest({ query: listSaleReturnsQuery }), list);
router.post('/', validateRequest({ body: createSaleReturnSchema }), create);
router.get('/:id', validateRequest({ params: idParam }), getSaleReturn);
router.patch(
  '/:id',
  validateRequest({ params: idParam, body: updateSaleReturnSchema }),
  update,
);
router.delete('/:id', validateRequest({ params: idParam }), remove);

export default router;
