"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.warmUpPool = exports.testPostgresConnection = void 0;
require("dotenv/config");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("@prisma/client");
const env_1 = __importDefault(require("./env"));
const adapter = new adapter_pg_1.PrismaPg({
    connectionString: env_1.default.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 300_000,
    connectionTimeoutMillis: 10_000,
});
const prisma = new client_1.PrismaClient({ adapter });
exports.prisma = prisma;
const testPostgresConnection = async () => {
    try {
        await prisma.$connect();
        console.log('Prisma connected successfully to the database');
    }
    catch (err) {
        console.error('Prisma connection to the database failed: ', err);
        throw err;
    }
};
exports.testPostgresConnection = testPostgresConnection;
const warmUpPool = async () => {
    await Promise.all(Array.from({ length: 5 }, () => prisma.admin.count()));
};
exports.warmUpPool = warmUpPool;
