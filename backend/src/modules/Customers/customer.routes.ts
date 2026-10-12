import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import {
  createCustomerSchema,
  listCustomersQuery,
  setCustomerStatusSchema,
  statementQuery,
  updateCustomerSchema,
} from './customer.validation';
import {
  createCustomer,
  update,
  setStatus,
  getCustomerList,
  getCustomer,
  statement,
} from './customer.controller';
import { idParam } from '../Suppliers/supplier.validation';

const router = Router();

router.use(protect);

router.get(
  '/',
  validateRequest({ query: listCustomersQuery }),
  getCustomerList,
);
router.post(
  '/',
  validateRequest({ body: createCustomerSchema }),
  createCustomer,
);
router.get('/:id', validateRequest({ params: idParam }), getCustomer);
router.get(
  '/:id/statement',
  validateRequest({ params: idParam, query: statementQuery }),
  statement,
);
router.patch(
  '/:id',
  validateRequest({ params: idParam, body: updateCustomerSchema }),
  update,
);
router.patch(
  '/:id/status',
  validateRequest({ params: idParam, body: setCustomerStatusSchema }),
  setStatus,
);

export default router;
