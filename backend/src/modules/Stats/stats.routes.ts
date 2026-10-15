import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';
import { validateRequest } from '@/common/middlewares/validation';
import { overviewQuery } from './stats.validation';
import { overview } from './stats.controller';

const router = Router();

router.use(protect);

router.get('/overview', validateRequest({ query: overviewQuery }), overview);

export default router;
