import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { createItem, setItemStatus, updateItem } from './item.controller';
import { validateRequest } from '@/common/middlewares/validation';
import {
  createItemSchema,
  itemIdParam,
  updateItemSchema,
  setItemStatusSchema,
} from './item.validation';

const router = Router();

router.use(protect);

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
