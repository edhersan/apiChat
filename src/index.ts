import cors from 'cors';
import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { config } from './config';
import { chatRouter } from './routes/chat';

const app = express();

const corsOrigin =
  config.corsOrigin === '*' ? '*' : config.corsOrigin.split(',').map((origin) => origin.trim());

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '32kb' }));
app.use(chatRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND' });
});

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'INVALID_JSON', message: 'El cuerpo debe ser JSON válido.' });
    return;
  }

  console.error('[server] Error inesperado:', error);
  res.status(500).json({ error: 'INTERNAL_ERROR' });
};

app.use(errorHandler);

if (!process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`API chat escuchando en http://localhost:${config.port}`);
  });
}

export default app;
