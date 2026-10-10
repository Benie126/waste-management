import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { notFoundHandler, errorHandler } from './middleware/error.middleware';
import { env } from './config/env';

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(
    cors({
      origin: env.corsOrigin.split(',').map((o) => o.trim()),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (env.nodeEnv !== 'test') app.use(morgan('dev'));

  app.use('/api', routes);

  app.get('/', (_req, res) => {
    res.json({ success: true, message: 'WasteLink API', docs: '/api/health' });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
