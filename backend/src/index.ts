import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { customersRouter } from './routes/customers';
import { productsRouter } from './routes/products';
import { challansRouter } from './routes/challans';
import { errorHandler } from './middleware/errorHandler';
import { startKeepAlive } from './lib/keepAlive';

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRouter);
app.use('/customers', customersRouter);
app.use('/products', productsRouter);
app.use('/challans', challansRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  startKeepAlive();
});

export default app;
