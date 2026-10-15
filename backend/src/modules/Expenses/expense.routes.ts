import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import {
  createExpenseSchema,
  listExpensesQuery,
  updateExpenseSchema,
} from './expense.validation';
import { create, getOne, list, remove, update } from './expense.controller';
import { idParam } from '../Suppliers/supplier.validation';

const router = Router();

router.use(protect);

router.get('/', validateRequest({ query: listExpensesQuery }), list);
router.post('/', validateRequest({ body: createExpenseSchema }), create);
router.get('/:id', validateRequest({ params: idParam }), getOne);
router.patch(
  '/:id',
  validateRequest({ params: idParam, body: updateExpenseSchema }),
  update,
);
router.delete('/:id', validateRequest({ params: idParam }), remove);

export default router;
