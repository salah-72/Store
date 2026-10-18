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
exports.returnable = exports.list = exports.remove = exports.update = exports.create = exports.getSaleReturn = void 0;
const catchAsync_1 = __importDefault(require("../../common/utils/catchAsync.js"));
const service = __importStar(require("./sale-return.service"));
const schemas_1 = require("../../common/utils/schemas.js");
exports.getSaleReturn = (0, catchAsync_1.default)(async (req, res) => {
    const id = Number(req.params.id);
    const saleReturn = await service.getSaleReturn(id);
    res.status(201).json({ success: true, data: saleReturn });
});
exports.create = (0, catchAsync_1.default)(async (req, res) => {
    const input = req.body;
    const ret = await service.createSaleReturn(input);
    res.status(201).json({ success: true, data: ret });
});
exports.update = (0, catchAsync_1.default)(async (req, res) => {
    const id = Number(req.params.id);
    const input = req.body;
    const ret = await service.updateSaleReturn(id, input);
    res.json({ success: true, data: ret });
});
exports.remove = (0, catchAsync_1.default)(async (req, res) => {
    const id = Number(req.params.id);
    await service.deleteSaleReturn(id);
    res.json({ success: true, data: { id } });
});
exports.list = (0, catchAsync_1.default)(async (req, res) => {
    const q = req.query;
    q.page = Number(q.page) || 1;
    q.limit = Number(q.limit) || 20;
    const { returns, total } = await service.listSaleReturns(q);
    res.json({
        success: true,
        data: returns,
        meta: (0, schemas_1.pageMeta)(total, q.page, q.limit),
    });
});
exports.returnable = (0, catchAsync_1.default)(async (req, res) => {
    const saleId = Number(req.params.saleId);
    res.json({ success: true, data: await service.getReturnable(saleId) });
});
