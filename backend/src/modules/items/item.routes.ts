import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import {
  createItem,
  setItemStatus,
  updateItem,
  listItem,
} from './item.controller';
import { validateRequest } from '@/common/middlewares/validation';
import {
  createItemSchema,
  itemIdParam,
  updateItemSchema,
  setItemStatusSchema,
  listItemsQuery,
} from './item.validation';

const router = Router();

router.use(protect);

router.get('/', validateRequest({ query: listItemsQuery }), listItem);
router.post('/', validateRequest({ body: createItemSchema }), createItem);
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
