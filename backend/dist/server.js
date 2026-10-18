"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const postgres_1 = require("./config/postgres");
const env_1 = __importDefault(require("./config/env"));
const app_1 = __importDefault(require("./app"));
const startServer = async () => {
    try {
        await (0, postgres_1.testPostgresConnection)();
        await (0, postgres_1.warmUpPool)();
        const server = app_1.default.listen(env_1.default.PORT, () => {
            console.log(`Server is running on port ${env_1.default.PORT}`);
        });
        const shutdown = async () => {
            server.close();
            await postgres_1.prisma.$disconnect();
            process.exit(0);
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }
    catch (err) {
        console.error('Failed to startup:', err);
        process.exit(1);
    }
};
startServer();
