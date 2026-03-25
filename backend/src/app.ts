import express from 'express';
import cors from 'cors';
import type { SignalConfig } from './config/signal.config.types';
import { createSignalsRouter } from './routes/signalsRouter';
import { createTweetsRouter } from './routes/tweetsRouter';

export function createApp(config: SignalConfig): express.Application {
  const app = express();
  app.use(express.json());

  const origins = config.corsOrigins;
  app.use(
    cors({
      origin: origins.length ? origins : true,
      credentials: true,
    })
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'nayft-alpha-feed' });
  });

  app.use('/nayft', createSignalsRouter());
  app.use('/nayft', createTweetsRouter());

  return app;
}
