import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { createItem } from './item.controller';
import { validateRequest } from '@/common/middlewares/validation';
import { createItemSchema } from './item.validation';

const router = Router();

router.use(protect);

router.post('/', validateRequest({ body: createItemSchema }), createItem);

export default router;
