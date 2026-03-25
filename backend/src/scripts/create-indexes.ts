import { loadEnv } from '../config/loadEnv';
import { buildSignalConfig } from '../config/signal.config';
import { connectMongo } from '../config/mongo';
import { signalsRepo } from '../data-access/signals.repo';

async function run(): Promise<void> {
  loadEnv();
  const config = buildSignalConfig();
  await connectMongo(config.mongoUri);
  await signalsRepo.ensureIndexes();
  // eslint-disable-next-line no-console
  console.log('nayft_signals indexes synced');
  process.exit(0);
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
