"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdmins = exports.deleteAdmin = exports.updatePassword = exports.refreshAccessToken = exports.logout = exports.getMe = exports.protect = exports.login = exports.createAdmin = void 0;
const appError_1 = __importDefault(require("../../../common/utils/appError"));
const catchAsync_1 = __importDefault(require("../../../common/utils/catchAsync"));
const postgres_1 = require("../../../config/postgres");
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const generateTokens_1 = require("../../../common/functions/generateTokens");
const env_1 = __importDefault(require("../../../config/env"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const hashToken = (token) => crypto_1.default.createHash('sha256').update(token).digest('hex');
const refreshCookie = {
    httpOnly: true,
    secure: env_1.default.NODE_ENV === 'production' || env_1.default.COOKIE_SAMESITE === 'none',
    sameSite: env_1.default.COOKIE_SAMESITE,
    path: '/auth',
};
const setRefreshCookie = (res, token) => {
    const { exp } = jsonwebtoken_1.default.decode(token);
    res.cookie('refreshToken', token, {
        ...refreshCookie,
        maxAge: exp * 1000 - Date.now(),
    });
};
exports.createAdmin = (0, catchAsync_1.default)(async (req, res, next) => {
    const { username, password } = req.body;
    const adminExist = await postgres_1.prisma.admin.findUnique({
        where: { username },
        select: { id: true },
    });
    if (adminExist)
        return next(new appError_1.default('this username is used', 409));
    const hashedPassword = await bcrypt_1.default.hash(password, 12);
    await postgres_1.prisma.admin.create({
        data: { username, password: hashedPassword },
    });
    res.status(201).json({ success: true, status: 'success' });
});
exports.login = (0, catchAsync_1.default)(async (req, res, next) => {
    const { username, password } = req.body;
    const user = await postgres_1.prisma.admin.findUnique({
        where: {
            username,
        },
    });
    if (!user || !(await bcrypt_1.default.compare(password, user.password))) {
        return next(new appError_1.default('Invalid username or password', 401));
    }
    const refreshToken = (0, generateTokens_1.generateRefreshToken)(user.id);
    const accessToken = (0, generateTokens_1.generateAccessToken)(user.id);
    await postgres_1.prisma.refreshToken.upsert({
        where: { adminId: user.id },
        update: { token: hashToken(refreshToken) },
        create: { adminId: user.id, token: hashToken(refreshToken) },
    });
    setRefreshCookie(res, refreshToken);
    res.status(200).json({
        success: true,
        status: 'success',
        user: { id: user.id, username: user.username },
        accessToken,
    });
});
exports.protect = (0, catchAsync_1.default)(async (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer '))
        return next(new appError_1.default('Access denied, no token provided', 401));
    const token = auth.split(' ')[1];
    let payload;
    try {
        payload = jsonwebtoken_1.default.verify(token, env_1.default.ACCESS_TOKEN_KEY);
    }
    catch (err) {
        return next(new appError_1.default('Invalid or expired token', 401));
    }
    const user = await postgres_1.prisma.admin.findUnique({
        where: { id: payload.id },
        select: { id: true, username: true },
    });
    if (!user)
        return next(new appError_1.default('admin not found', 401));
    req.user = user;
    next();
});
exports.getMe = (0, catchAsync_1.default)(async (req, res, next) => {
    res.status(200).json({ success: true, status: 'success', user: req.user });
});
exports.logout = (0, catchAsync_1.default)(async (req, res, next) => {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
        await postgres_1.prisma.refreshToken.deleteMany({
            where: { token: hashToken(refreshToken) },
        });
    }
    res.clearCookie('refreshToken', refreshCookie);
    res.status(200).json({
        success: true,
        status: 'success',
        message: 'logout successfully',
    });
});
exports.refreshAccessToken = (0, catchAsync_1.default)(async (req, res, next) => {
    const refreshToken = req.cookies?.refreshToken ||
        req.body?.refreshToken;
    if (!refreshToken)
        return next(new appError_1.default('refresh token not exist', 401));
    let payload;
    try {
        payload = jsonwebtoken_1.default.verify(refreshToken, env_1.default.REFRESH_TOKEN_KEY);
    }
    catch (err) {
        return next(new appError_1.default('Invalid or expired token', 401));
    }
    const stored = await postgres_1.prisma.refreshToken.findFirst({
        where: { token: hashToken(refreshToken), adminId: payload.id },
    });
    if (!stored)
        return next(new appError_1.default('refresh token not exist, log in again', 401));
    const admin = await postgres_1.prisma.admin.findUnique({
        where: { id: payload.id },
        select: { id: true, username: true },
    });
    if (!admin)
        return next(new appError_1.default('User no longer exists', 401));
    res.status(200).json({
        success: true,
        status: 'success',
        user: admin,
        accessToken: (0, generateTokens_1.generateAccessToken)(admin.id),
    });
});
exports.updatePassword = (0, catchAsync_1.default)(async (req, res, next) => {
    const { oldPassword, newPassword } = req.body;
    const admin = await postgres_1.prisma.admin.findUnique({
        where: { id: req.user.id },
    });
    if (!admin || !(await bcrypt_1.default.compare(oldPassword, admin.password))) {
        return next(new appError_1.default('Old password is wrong', 401));
    }
    const hashedNewPassword = await bcrypt_1.default.hash(newPassword, 12);
    await postgres_1.prisma.admin.update({
        where: { id: admin.id },
        data: { password: hashedNewPassword },
    });
    await postgres_1.prisma.refreshToken.deleteMany({ where: { adminId: admin.id } });
    res.clearCookie('refreshToken', refreshCookie);
    res.status(200).json({
        success: true,
        status: 'success',
        message: 'password changed successfully, please log in again',
    });
});
exports.deleteAdmin = (0, catchAsync_1.default)(async (req, res, next) => {
    const adminId = Number(req.params.adminId);
    await postgres_1.prisma.admin.delete({ where: { id: adminId } });
    res.status(204).send();
});
exports.getAdmins = (0, catchAsync_1.default)(async (req, res, next) => {
    const admins = await postgres_1.prisma.admin.findMany({
        select: { id: true, username: true },
    });
    res.status(200).json({
        success: true,
        status: 'success',
        data: { admins },
    });
});
