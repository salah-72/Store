import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import { createExpenseSchema } from './expense.validation';
import { create } from './expense.controller';

const router = Router();

router.use(protect);

router.post('/', validateRequest({ body: createExpenseSchema }), create);

export default router;
