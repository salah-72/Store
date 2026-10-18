"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = void 0;
const appError_1 = __importDefault(require("../utils/appError"));
const isDev = () => process.env.NODE_ENV === 'development';
const fromPrisma = (err) => {
    if (err?.name !== 'PrismaClientKnownRequestError')
        return null;
    switch (err.code) {
        case 'P2002':
            return new appError_1.default('A record with the same unique value already exists', 409);
        case 'P2003':
            return new appError_1.default('This record is used by other records', 409);
        case 'P2025':
            return new appError_1.default('Record not found', 404);
        case 'P2034':
            return new appError_1.default('Two requests collided: please try again', 409);
        case 'P2028':
            return new appError_1.default('The database was busy: please try again', 503);
        default:
            return null;
    }
};
const fromExpress = (err) => {
    if (err?.type === 'entity.parse.failed')
        return new appError_1.default('Request body is not valid JSON', 400);
    if (err?.type === 'entity.too.large')
        return new appError_1.default('Request body is too large', 413);
    return null;
};
const notFound = (req, _res, next) => {
    next(new appError_1.default(`Route ${req.method} ${req.originalUrl} not found`, 404));
};
exports.notFound = notFound;
const errorHandler = (err, req, res, next) => {
    const known = err instanceof appError_1.default ? err : (fromPrisma(err) ?? fromExpress(err));
    if (known) {
        return res.status(known.statusCode).json({
            success: false,
            status: known.status,
            message: known.message,
            ...(isDev() && { stack: err?.stack }),
        });
    }
    console.error(`[${req.method} ${req.originalUrl}]`, err);
    res.status(500).json({
        success: false,
        status: 'error',
        message: isDev()
            ? (err?.message ?? 'Something went wrong!')
            : 'Something went wrong!',
        ...(isDev() && { stack: err?.stack }),
    });
};
exports.default = errorHandler;
