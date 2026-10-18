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
exports.statement = exports.getSupplier = exports.getSupplierList = exports.setSupplierStatus = exports.updateSupplier = exports.createSupplier = void 0;
const catchAsync_1 = __importDefault(require("../../common/utils/catchAsync.js"));
const service = __importStar(require("./supplier.service"));
const schemas_1 = require("../../common/utils/schemas.js");
exports.createSupplier = (0, catchAsync_1.default)(async (req, res) => {
    const input = req.body;
    const supplier = await service.createSupplierService(input);
    res.status(201).json({
        status: true,
        data: supplier,
    });
});
exports.updateSupplier = (0, catchAsync_1.default)(async (req, res) => {
    const id = Number(req.params.id);
    const input = req.body;
    const supplier = await service.updateSupplierService(id, input);
    res.status(200).json({
        status: true,
        data: supplier,
    });
});
exports.setSupplierStatus = (0, catchAsync_1.default)(async (req, res) => {
    const id = Number(req.params.id);
    const { isActive } = req.body;
    const supplier = await service.setSupplierStatusService(id, isActive);
    res.status(200).json({
        status: true,
        data: supplier,
    });
});
exports.getSupplierList = (0, catchAsync_1.default)(async (req, res) => {
    const q = req.query;
    q.page = Number(q.page) || 1;
    q.limit = Number(q.limit) || 20;
    const { suppliers, total } = await service.listSuppliers(q);
    res.json({
        success: true,
        data: suppliers,
        meta: (0, schemas_1.pageMeta)(total, q.page, q.limit),
    });
});
exports.getSupplier = (0, catchAsync_1.default)(async (req, res) => {
    const id = Number(req.params.id);
    res.json({ success: true, data: await service.getSupplier(id) });
});
exports.statement = (0, catchAsync_1.default)(async (req, res) => {
    const id = Number(req.params.id);
    const { from, to } = req.query;
    res.json({ success: true, data: await service.getStatement(id, from, to) });
});
