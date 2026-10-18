"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginLimiter = exports.checkNoOfAdmins = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const appError_1 = __importDefault(require("../../../common/utils/appError"));
const catchAsync_1 = __importDefault(require("../../../common/utils/catchAsync"));
const postgres_1 = require("../../../config/postgres");
exports.checkNoOfAdmins = (0, catchAsync_1.default)(async (req, res, next) => {
    const admins = await postgres_1.prisma.admin.count();
    if (admins <= 1)
        return next(new appError_1.default('You are the only admin', 400));
    next();
});
exports.loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        success: false,
        status: 'fail',
        message: 'Too many login attempts, please try again after 15 minutes',
    },
});
