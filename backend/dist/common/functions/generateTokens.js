"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRefreshToken = exports.generateAccessToken = void 0;
const env_1 = __importDefault(require("./../../config/env"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const generateAccessToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, env_1.default.ACCESS_TOKEN_KEY, {
        expiresIn: env_1.default.ACCESS_TOKEN_EXPIRED_IN,
    });
};
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, env_1.default.REFRESH_TOKEN_KEY, {
        expiresIn: env_1.default.REFRESH_TOKEN_EXPIRED_IN,
    });
};
exports.generateRefreshToken = generateRefreshToken;
