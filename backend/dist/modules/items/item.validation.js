"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.listItemsQuery = exports.setItemStatusSchema = exports.updateItemSchema = exports.createItemSchema = exports.itemIdParam = void 0;
const z = __importStar(require("zod"));
const schemas_1 = require("../../common/utils/schemas");
const fields = {
    name: z.string().trim().min(1, 'Name is required').max(150),
    description: z.string().trim().max(500).nullable().optional(),
    unit: z.enum(['PIECE', 'GRAM', 'ML']),
    price: z.coerce
        .number()
        .min(0)
        .max(9_999_999.99)
        .transform((v) => Math.round(v * 100) / 100),
    packName: z.string().trim().max(50).nullable().optional(),
    packSize: z.coerce.number().int().min(1).nullable().optional(),
    reorderLevel: z.coerce.number().int().min(0),
};
exports.itemIdParam = z.object({
    id: z.coerce.number().int().min(1),
});
exports.createItemSchema = z
    .object({
    ...fields,
    reorderLevel: fields.reorderLevel.default(0),
})
    .strict();
exports.updateItemSchema = z
    .object(fields)
    .partial()
    .strict()
    .refine((o) => Object.keys(o).length > 0, { message: 'Nothing to update' });
exports.setItemStatusSchema = z
    .object({
    isActive: z.boolean(),
})
    .strict();
exports.listItemsQuery = schemas_1.pagination.extend({
    search: z.string().trim().max(100).optional(),
    unit: z.enum(['PIECE', 'GRAM', 'ML']).optional(),
    active: z.enum(['true', 'false', 'all']).default('true'),
    lowStock: z
        .enum(['true', 'false'])
        .optional()
        .transform((v) => v === 'true'),
});
