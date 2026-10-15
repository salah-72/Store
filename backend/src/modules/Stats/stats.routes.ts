import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import { overviewQuery, salesByDayQuery } from './stats.validation';
import { overview, salesByDay } from './stats.controller';

const router = Router();

router.use(protect);

router.get('/overview', validateRequest({ query: overviewQuery }), overview);
router.get(
  '/sales-by-day',
  validateRequest({ query: salesByDayQuery }),
  salesByDay,
);

export default router;
