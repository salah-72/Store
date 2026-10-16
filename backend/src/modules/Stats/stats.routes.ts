import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import {
  overviewQuery,
  salesByDayQuery,
  staleStockQuery,
  topItemsQuery,
} from './stats.validation';
import { overview, salesByDay, staleStock, topItems } from './stats.controller';

const router = Router();

router.use(protect);

router.get('/overview', validateRequest({ query: overviewQuery }), overview);
router.get(
  '/sales-by-day',
  validateRequest({ query: salesByDayQuery }),
  salesByDay,
);
router.get('/top-items', validateRequest({ query: topItemsQuery }), topItems);
router.get(
  '/stale-stock',
  validateRequest({ query: staleStockQuery }),
  staleStock,
);

export default router;
