import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import { idParam } from '../Suppliers/supplier.validation';
import {
  create,
  getOne,
  list,
  remove,
  returnable,
  update,
} from './purchase-return.controller';
import {
  createPurchaseReturnSchema,
  listPurchaseReturnsQuery,
  purchaseIdParam,
  updatePurchaseReturnSchema,
} from './purchase-return.validation';

const router = Router();

router.use(protect);

router.get('/', validateRequest({ query: listPurchaseReturnsQuery }), list);
router.post('/', validateRequest({ body: createPurchaseReturnSchema }), create);
router.get(
  '/returnable/:purchaseId',
  validateRequest({ params: purchaseIdParam }),
  returnable,
);
router.get('/:id', validateRequest({ params: idParam }), getOne);
router.patch(
  '/:id',
  validateRequest({ params: idParam, body: updatePurchaseReturnSchema }),
  update,
);
router.delete('/:id', validateRequest({ params: idParam }), remove);

export default router;
