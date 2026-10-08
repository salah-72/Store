import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { createItem, updateItem } from './item.controller';
import { validateRequest } from '@/common/middlewares/validation';
import {
  createItemSchema,
  itemIdParam,
  updateItemSchema,
} from './item.validation';

const router = Router();

router.use(protect);

router.post('/', validateRequest({ body: createItemSchema }), createItem);
router.patch(
  '/:id',
  validateRequest({ params: itemIdParam, body: updateItemSchema }),
  updateItem,
);

export default router;
