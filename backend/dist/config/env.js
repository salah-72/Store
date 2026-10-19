"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const env = {
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    REFRESH_TOKEN_KEY: process.env.REFRESH_TOKEN_KEY,
    ACCESS_TOKEN_KEY: process.env.ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_EXPIRED_IN: process.env.REFRESH_TOKEN_EXPIRED_IN,
    ACCESS_TOKEN_EXPIRED_IN: process.env.ACCESS_TOKEN_EXPIRED_IN,
    COOKIE_SAMESITE: process.env.COOKIE_SAMESITE,
    CLIENT_URL: process.env.CLIENT_URL,
};
exports.default = env;
