import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import {
  createItem,
  setItemStatus,
  updateItem,
  listItem,
  getItem,
  listItemSales,
  listItemPurchases,
} from './item.controller';
import { validateRequest } from '@/common/middlewares/validation';
import {
  createItemSchema,
  itemIdParam,
  updateItemSchema,
  setItemStatusSchema,
  listItemsQuery,
  itemSalesQuery,
  itemPurchasesQuery,
} from './item.validation';

const router = Router();

router.use(protect);

router.get('/', validateRequest({ query: listItemsQuery }), listItem);
router.post('/', validateRequest({ body: createItemSchema }), createItem);
router.get('/:id', validateRequest({ params: itemIdParam }), getItem);
router.get(
  '/:id/sales',
  validateRequest({ params: itemIdParam, query: itemSalesQuery }),
  listItemSales,
);
router.get(
  '/:id/purchases',
  validateRequest({ params: itemIdParam, query: itemPurchasesQuery }),
  listItemPurchases,
);
router.patch(
  '/:id',
  validateRequest({ params: itemIdParam, body: updateItemSchema }),
  updateItem,
);
router.patch(
  '/:id/status',
  validateRequest({ params: itemIdParam, body: setItemStatusSchema }),
  setItemStatus,
);

export default router;
