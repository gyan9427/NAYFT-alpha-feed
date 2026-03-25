import cron from 'node-cron';
import { createApp } from './app';
import { loadEnv } from './config/loadEnv';
import { buildSignalConfig } from './config/signal.config';
import { connectMongo } from './config/mongo';
import { runSignalPipeline } from './pipeline/runSignalPipeline';
import { signalsRepo } from './data-access/signals.repo';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  loadEnv();
  const config = buildSignalConfig();

  await connectMongo(config.mongoUri);
  try {
    await signalsRepo.ensureIndexes();
  } catch (e) {
    logger.warn({ err: e }, 'ensureIndexes skipped or failed');
  }

  const app = createApp(config);
  const port = config.port;

  cron.schedule(
    config.cronSchedule,
    () => {
      runSignalPipeline(config).catch((err) => {
        logger.error({ err }, 'runSignalPipeline cron failure');
      });
    },
    { timezone: 'UTC' }
  );
  logger.info({ schedule: config.cronSchedule }, 'Signal pipeline cron registered');

  setImmediate(() => {
    runSignalPipeline(config).catch((err) => {
      logger.error({ err }, 'initial runSignalPipeline failed');
    });
  });

  app.listen(port, '0.0.0.0', () => {
    logger.info({ port }, 'NAYFT Alpha Feed backend listening');
  });
}

main().catch((e) => {
  logger.fatal({ err: e }, 'fatal startup');
  process.exit(1);
});
