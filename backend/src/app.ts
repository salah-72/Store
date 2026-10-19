import express, { urlencoded } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import authRouter from './modules/Auth/routes/authRouter';
import itemRouter from './modules/items/item.routes';
import supplierRouter from './modules/Suppliers/supplier.routes';
import purchaseRouter from './modules/Purchase/purchase.route';
import customerRouter from './modules/Customers/customer.routes';
import salesRouter from './modules/Sale/sale.routes';
import saleReturnRouter from './modules/Sale-Return/sale-return.routes';
import purchaseReturnRouter from './modules/Purchase-Return/purchase-return.routes';
import paymentRouter from './modules/Payments/payment.routes';
import adjustmentRouter from './modules/Adjustment/adjustment.routes';
import expenseRouter from './modules/Expenses/expense.routes';
import statsRouter from './modules/Stats/stats.routes';
import errorHandler, { notFound } from './common/middlewares/errorHandler';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import env from './config/env';

const app = express();

const authSwagger = YAML.load(
  path.join(process.cwd(), 'src/docs/auth.swagger.yaml'),
);
const itemSwagger = YAML.load(
  path.join(process.cwd(), 'src/docs/item.swagger.yaml'),
);
const supplierSwagger = YAML.load(
  path.join(process.cwd(), 'src/docs/supplier.swagger.yaml'),
);
const purchaseSwagger = YAML.load(
  path.join(process.cwd(), 'src/docs/purchase.swagger.yaml'),
);
const customerSwagger = YAML.load(
  path.join(process.cwd(), 'src/docs/customer.swagger.yaml'),
);
const saleSwagger = YAML.load(
  path.join(process.cwd(), 'src/docs/sale.swagger.yaml'),
);
const saleReturnSwagger = YAML.load(
  path.join(process.cwd(), 'src/docs/sale-return.swagger.yaml'),
);
const purchaseReturnSwagger = YAML.load(
  path.join(process.cwd(), 'src/docs/purchase-return.swagger.yaml'),
);
const paymentSwagger = YAML.load(
  path.join(process.cwd(), 'src/docs/payment.swagger.yaml'),
);
const adjustmentSwagger = YAML.load(
  path.join(process.cwd(), 'src/docs/stock-adjustment.swagger.yaml'),
);
const expenseSwagger = YAML.load(
  path.join(process.cwd(), 'src/docs/expense.swagger.yaml'),
);
const statsSwagger = YAML.load(
  path.join(process.cwd(), 'src/docs/stats.swagger.yaml'),
);

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

const limiter = rateLimit({
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

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: env.CLIENT_URL!.split(','),
    credentials: true,
  }),
);
app.use(limiter);
app.use(express.json({ limit: '100kb' }));
app.use(urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression({ threshold: 1024 }));

app.get('/', async (req, res) => {
  res.send('welcome');
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/auth', authRouter);
app.use('/items', itemRouter);
app.use('/suppliers', supplierRouter);
app.use('/purchases', purchaseRouter);
app.use('/customers', customerRouter);
app.use('/sales', salesRouter);
app.use('/sale-returns', saleReturnRouter);
app.use('/purchase-returns', purchaseReturnRouter);
app.use('/payments', paymentRouter);
app.use('/stock-adjustments', adjustmentRouter);
app.use('/expenses', expenseRouter);
app.use('/stats', statsRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
