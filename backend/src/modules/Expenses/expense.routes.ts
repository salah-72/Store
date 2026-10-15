import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import { createExpenseSchema } from './expense.validation';
import { create, getOne } from './expense.controller';
import { idParam } from '../Suppliers/supplier.validation';

const router = Router();

router.use(protect);

router.post('/', validateRequest({ body: createExpenseSchema }), create);
router.get('/:id', validateRequest({ params: idParam }), getOne);
export default router;
