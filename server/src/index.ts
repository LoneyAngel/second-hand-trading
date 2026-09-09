import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import { productsRouter } from './routes/products';
import { categoriesRouter } from './routes/categories';
import { rentalsRouter } from './routes/rentals';
import { usersRouter } from './routes/user';
import { addressesRouter } from './routes/addresses';
import { uploadRouter } from './routes/upload';
import { adminRouter } from './routes/admin';
import { messagesRouter } from './routes/messages';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// CORS 配置
const corsOriginEnv = process.env.CORS_ORIGIN || '*';
const corsOrigins = corsOriginEnv === '*' ? '*' : corsOriginEnv.split(',');

app.use(
  cors({
    origin: corsOrigins === '*' ? '*' : corsOrigins,
    credentials: true,
  }),
);

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API 路由
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/rentals', rentalsRouter);
app.use('/api/addresses', addressesRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/admin', adminRouter);
app.use('/api/messages', messagesRouter);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// 简单的错误处理
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.error(`Server is running on port ${PORT}`);
});
