import express, { urlencoded } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import authRouter from './modules/Auth/routes/authRouter';
import itemRouter from './modules/items/item.routes';
import errorHandler from './common/middlewares/errorHandler';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();

const swaggerDocument = YAML.load(
  path.join(__dirname, './docs/auth.swagger.yaml'),
);

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

app.use(errorHandler);

export default app;
