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
import errorHandler from './common/middlewares/errorHandler';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

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
    schemas: {
      ...authSwagger.components?.schemas,
      ...itemSwagger.components?.schemas,
      ...supplierSwagger.components?.schemas,
      ...purchaseSwagger.components?.schemas,
      ...customerSwagger.components?.schemas,
      ...saleSwagger.components?.schemas,
      ...saleReturnSwagger.components?.schemas,
      ...purchaseReturnSwagger.components?.schemas,
    },
  },
};

const limiter = rateLimit({
  limit: 60,
  windowMs: 30000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: 'too many requests from same ip, try again later',
  },
});

app.use(helmet());
app.use(
  cors({
    origin: '*',
  }),
);
app.use(limiter);
app.use(express.json({ limit: '10kb' }));
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
app.use('/purchase', purchaseRouter);
app.use('/customer', customerRouter);
app.use('/sales', salesRouter);
app.use('/sale-returns', saleReturnRouter);
app.use('/purchase-returns', purchaseReturnRouter);

app.use(errorHandler);

export default app;
