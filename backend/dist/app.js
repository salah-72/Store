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
const express_1 = __importStar(require("express"));
const cors_1 = __importDefault(require("cors"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const yamljs_1 = __importDefault(require("yamljs"));
const path_1 = __importDefault(require("path"));
const authRouter_1 = __importDefault(require("./modules/Auth/routes/authRouter"));
const item_routes_1 = __importDefault(require("./modules/items/item.routes"));
const supplier_routes_1 = __importDefault(require("./modules/Suppliers/supplier.routes"));
const purchase_route_1 = __importDefault(require("./modules/Purchase/purchase.route"));
const customer_routes_1 = __importDefault(require("./modules/Customers/customer.routes"));
const sale_routes_1 = __importDefault(require("./modules/Sale/sale.routes"));
const sale_return_routes_1 = __importDefault(require("./modules/Sale-Return/sale-return.routes"));
const purchase_return_routes_1 = __importDefault(require("./modules/Purchase-Return/purchase-return.routes"));
const payment_routes_1 = __importDefault(require("./modules/Payments/payment.routes"));
const adjustment_routes_1 = __importDefault(require("./modules/Adjustment/adjustment.routes"));
const expense_routes_1 = __importDefault(require("./modules/Expenses/expense.routes"));
const stats_routes_1 = __importDefault(require("./modules/Stats/stats.routes"));
const errorHandler_1 = __importStar(require("./common/middlewares/errorHandler"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const compression_1 = __importDefault(require("compression"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = __importDefault(require("./config/env"));
const app = (0, express_1.default)();
const authSwagger = yamljs_1.default.load(path_1.default.join(process.cwd(), 'src/docs/auth.swagger.yaml'));
const itemSwagger = yamljs_1.default.load(path_1.default.join(process.cwd(), 'src/docs/item.swagger.yaml'));
const supplierSwagger = yamljs_1.default.load(path_1.default.join(process.cwd(), 'src/docs/supplier.swagger.yaml'));
const purchaseSwagger = yamljs_1.default.load(path_1.default.join(process.cwd(), 'src/docs/purchase.swagger.yaml'));
const customerSwagger = yamljs_1.default.load(path_1.default.join(process.cwd(), 'src/docs/customer.swagger.yaml'));
const saleSwagger = yamljs_1.default.load(path_1.default.join(process.cwd(), 'src/docs/sale.swagger.yaml'));
const saleReturnSwagger = yamljs_1.default.load(path_1.default.join(process.cwd(), 'src/docs/sale-return.swagger.yaml'));
const purchaseReturnSwagger = yamljs_1.default.load(path_1.default.join(process.cwd(), 'src/docs/purchase-return.swagger.yaml'));
const paymentSwagger = yamljs_1.default.load(path_1.default.join(process.cwd(), 'src/docs/payment.swagger.yaml'));
const adjustmentSwagger = yamljs_1.default.load(path_1.default.join(process.cwd(), 'src/docs/stock-adjustment.swagger.yaml'));
const expenseSwagger = yamljs_1.default.load(path_1.default.join(process.cwd(), 'src/docs/expense.swagger.yaml'));
const statsSwagger = yamljs_1.default.load(path_1.default.join(process.cwd(), 'src/docs/stats.swagger.yaml'));
const swaggerDocument = {
    ...authSwagger,
    paths: {
        ...authSwagger.paths,
        ...itemSwagger.paths,
        ...supplierSwagger.paths,
        ...purchaseSwagger.paths,
        ...customerSwagger.paths,
        ...saleSwagger.paths,
        ...saleReturnSwagger.paths,
        ...purchaseReturnSwagger.paths,
        ...paymentSwagger.paths,
        ...adjustmentSwagger.paths,
        ...expenseSwagger.paths,
        ...statsSwagger.paths,
    },
    components: {
        ...authSwagger.components,
        ...itemSwagger.components,
        ...supplierSwagger.components,
        ...purchaseSwagger.components,
        ...customerSwagger.components,
        ...saleSwagger.components,
        ...saleReturnSwagger.components,
        ...purchaseReturnSwagger.components,
        ...paymentSwagger.components,
        ...adjustmentSwagger.components,
        ...expenseSwagger.components,
        ...statsSwagger.components,
        schemas: {
            ...authSwagger.components?.schemas,
            ...itemSwagger.components?.schemas,
            ...supplierSwagger.components?.schemas,
            ...purchaseSwagger.components?.schemas,
            ...customerSwagger.components?.schemas,
            ...saleSwagger.components?.schemas,
            ...saleReturnSwagger.components?.schemas,
            ...purchaseReturnSwagger.components?.schemas,
            ...paymentSwagger.components?.schemas,
            ...adjustmentSwagger.components?.schemas,
            ...expenseSwagger.components?.schemas,
            ...statsSwagger.components?.schemas,
        },
    },
};
const limiter = (0, express_rate_limit_1.default)({
    limit: 300,
    windowMs: 60000,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        success: false,
        status: 'fail',
        message: 'too many requests from same ip, try again later',
    },
});
app.set('trust proxy', 1);
app.use((req, res, next) => {
    res.setHeader('x-build', 'cors-fix-1');
    next();
});
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use((0, cors_1.default)({
    origin: env_1.default.CLIENT_URL.split(','),
    credentials: true,
}));
app.use(limiter);
app.use(express_1.default.json({ limit: '100kb' }));
app.use((0, express_1.urlencoded)({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use((0, compression_1.default)({ threshold: 1024 }));
app.get('/', async (req, res) => {
    res.send('welcome');
});
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocument));
app.use('/auth', authRouter_1.default);
app.use('/items', item_routes_1.default);
app.use('/suppliers', supplier_routes_1.default);
app.use('/purchases', purchase_route_1.default);
app.use('/customers', customer_routes_1.default);
app.use('/sales', sale_routes_1.default);
app.use('/sale-returns', sale_return_routes_1.default);
app.use('/purchase-returns', purchase_return_routes_1.default);
app.use('/payments', payment_routes_1.default);
app.use('/stock-adjustments', adjustment_routes_1.default);
app.use('/expenses', expense_routes_1.default);
app.use('/stats', stats_routes_1.default);
app.use(errorHandler_1.notFound);
app.use(errorHandler_1.default);
exports.default = app;
