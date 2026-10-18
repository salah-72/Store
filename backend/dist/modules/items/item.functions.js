"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveShape = exports.isNameUnique = void 0;
const appError_1 = __importDefault(require("../../common/utils/appError.js"));
const postgres_1 = require("../../config/postgres.js");
const isNameUnique = async (name) => {
    const existingItem = await postgres_1.prisma.item.findFirst({
        where: {
            name: {
                equals: name,
                mode: 'insensitive',
            },
        },
    });
    if (existingItem)
        throw new appError_1.default('Item name must be unique', 400);
};
exports.isNameUnique = isNameUnique;
const resolveShape = (i) => {
    const priceBasis = i.unit === 'PIECE' ? 1 : 1000;
    const packName = i.packName?.trim() || null;
    const packSize = i.packSize ?? null;
    //   if ((packName === null) !== (packSize === null)) {
    //     throw new appError(
    //       'Both pack name and size must be provided together',
    //       400,
    //     );
    //   }
    return { priceBasis, packName, packSize };
};
exports.resolveShape = resolveShape;
