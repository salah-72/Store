import { Admin } from '../../generated/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: Admin;
    }
  }
}
