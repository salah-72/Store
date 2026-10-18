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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePurchase = exports.listPurchases = exports.updatePurchase = exports.getPurchase = exports.createPurchase = void 0;
const catchAsync_1 = __importDefault(require("../../common/utils/catchAsync.js"));
const service = __importStar(require("./purchase.service"));
const schemas_1 = require("../../common/utils/schemas.js");
exports.createPurchase = (0, catchAsync_1.default)(async (req, res) => {
    const input = req.body;
    const purchase = await service.createPurchase(input);
    res.status(201).json({ success: true, data: purchase });
});
exports.getPurchase = (0, catchAsync_1.default)(async (req, res) => {
    const id = Number(req.params.id);
    res.json({ success: true, data: await service.getPurchase(id) });
});
exports.updatePurchase = (0, catchAsync_1.default)(async (req, res) => {
    const id = Number(req.params.id);
    const input = req.body;
    const purchase = await service.updatePurchase(id, input);
    res.json({ success: true, data: purchase });
});
exports.listPurchases = (0, catchAsync_1.default)(async (req, res) => {
    const q = req.query;
    q.page = Number(q.page) || 1;
    q.limit = Number(q.limit) || 20;
    const { purchases, total } = await service.listPurchases(q);
    res.json({
        success: true,
        data: purchases,
        meta: (0, schemas_1.pageMeta)(total, q.page, q.limit),
    });
});
exports.deletePurchase = (0, catchAsync_1.default)(async (req, res) => {
    const id = Number(req.params.id);
    await service.deletePurchase(id);
    res.json({ success: true, data: { id } });
});
