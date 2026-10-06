import { validateRequest } from '@/common/middlewares/validation';
import {
  createAdmin,
  deleteAdmin,
  getAdmins,
  login,
  logout,
  protect,
  refreshAccessToken,
  updatePassword,
} from '../../../modules/Auth/controllers/authController';
import {
  addAdminValidation,
  deleteAdminValidation,
  loginValidation,
  updatePasswordValidation,
} from '../../../modules/Auth/validations/authValidation';
import { Router } from 'express';
import { checkNoOfAdmins, loginLimiter } from '../middlewares/authMiddlewares';

const router = Router();

router.post(
  '/newAdmin',
  protect,
  validateRequest({ body: addAdminValidation }),
  createAdmin,
);

router.post(
  '/login',
  loginLimiter,
  validateRequest({ body: loginValidation }),
  login,
);

router.post('/logout', protect, logout);

router.post('/refresh', refreshAccessToken);

router.patch(
  '/password',
  protect,
  validateRequest({ body: updatePasswordValidation }),
  updatePassword,
);

router.delete(
  '/:adminId',
  protect,
  validateRequest({ params: deleteAdminValidation }),
  checkNoOfAdmins,
  deleteAdmin,
);

router.get('/admins', protect, getAdmins);
export default router;
