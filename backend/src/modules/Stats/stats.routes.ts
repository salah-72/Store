import { Router } from 'express';
import { protect } from '../Auth/controllers/authController';

const router = Router();

router.use(protect);

export default router;
