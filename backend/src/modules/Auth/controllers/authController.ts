import appError from '../../../common/utils/appError';
import catchAsync from '../../../common/utils/catchAsync';
import { prisma } from '../../../config/postgres';
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import {
  generateAccessToken,
  generateRefreshToken,
} from '../../../common/functions/generateTokens';
import env from '../../../config/env';
import jwt from 'jsonwebtoken';

export const createAdmin = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { username, password } = req.body;
    const adminExist = await prisma.admin.findUnique({
      where: {
        username,
      },
    });

    if (adminExist) return next(new appError('this username is used', 400));

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.admin.create({
      data: {
        username,
        password: hashedPassword,
      },
    });

    res.status(201).json({
      status: 'success',
    });
  },
);

export const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { username, password } = req.body;
    const user = await prisma.admin.findUnique({
      where: {
        username,
      },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return next(new appError('Invalid username or password', 401));
    }

    const refreshToken = await generateRefreshToken(user.id);
    const accessToken = await generateAccessToken(user.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 20 * 24 * 60 * 60 * 1000,
    });

    await prisma.refreshToken.upsert({
      where: {
        adminId: user.id,
      },
      update: {
        token: refreshToken,
      },
      create: {
        adminId: user.id,
        token: refreshToken,
      },
    });

    const { password: _, ...adminData } = user;

    res.status(200).json({
      status: 'success',
      user: adminData,
      accessToken,
    });
  },
);

interface JwtPayload extends jwt.JwtPayload {
  id: number;
}

export const protect = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer '))
      return next(new appError('Access denied, no token provided', 401));

    const token = auth.split(' ')[1];

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.ACCESS_TOKEN_KEY as string) as JwtPayload;
    } catch (err) {
      return next(new appError('Invalid or expired token', 401));
    }

    const user = await prisma.admin.findUnique({
      where: { id: payload.id },
    });

    if (!user) return next(new appError('admin not found', 401));

    req.user = user;
    next();
  },
);

export const logout = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const refreshToken = req.cookies.refreshToken as string;

    if (!refreshToken) return next(new appError('you are not logging in', 400));

    await prisma.refreshToken.deleteMany({
      where: {
        token: refreshToken,
      },
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.status(200).json({
      success: 'success',
      message: 'logout successfully',
    });
  },
);

export const refreshAccessToken = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const refreshToken =
      (req.cookies.refreshToken as string) || (req.body.refreshToken as string);
    if (!refreshToken)
      return next(new appError('refresh token not exist', 401));

    const exist = await prisma.refreshToken.findFirst({
      where: { token: refreshToken },
    });

    if (!exist)
      return next(new appError('refresh token not exist, log in again', 401));

    let payload: JwtPayload;
    try {
      payload = jwt.verify(
        refreshToken,
        env.REFRESH_TOKEN_KEY as string,
      ) as JwtPayload;
    } catch (err) {
      return next(new appError('Invalid or expired token', 401));
    }
    const admin = await prisma.admin.findUnique({
      where: { id: payload.id },
    });

    if (!admin) {
      return next(new appError('User no longer exists', 401));
    }

    const accessToken = generateAccessToken(admin.id);

    res.status(200).json({
      status: 'success',
      accessToken,
    });
  },
);

export const updatePassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { oldPassword, newPassword } = req.body;

    const isCorrect = await bcrypt.compare(oldPassword, req.user!.password);
    if (!isCorrect) {
      return next(new appError('Old password is wrong', 401));
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await prisma.admin.update({
      where: { id: req.user!.id },
      data: { password: hashedNewPassword },
    });

    await prisma.refreshToken.deleteMany({
      where: { adminId: req.user!.id },
    });

    res.status(200).json({
      status: 'success',
      message: 'password changed successfully, please log in again',
    });
  },
);

export const deleteAdmin = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const adminId = Number(req.params.adminId);

    await prisma.admin.delete({
      where: { id: adminId },
    });

    res.status(204).send();
  },
);

export const getAdmins = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const admins = await prisma.admin.findMany({
      select: { id: true, username: true },
    });
    res.status(200).json({
      status: 'success',
      data: {
        admins,
      },
    });
  },
);
