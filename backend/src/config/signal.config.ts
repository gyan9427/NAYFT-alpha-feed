import type { SignalConfig } from './signal.config.types';

function num(v: string | undefined, d: number): number {
  if (v === undefined || v === '') return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function int(v: string | undefined, d: number): number {
  return Math.floor(num(v, d));
}

function list(v: string | undefined, fallback: string[]): string[] {
  if (!v?.trim()) return fallback;
  return v
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

/** Comma-separated values where case must be preserved (e.g. CORS origins). */
function commaList(v: string | undefined, fallback: string[]): string[] {
  if (!v?.trim()) return fallback;
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Built once at process startup. Business logic reads this object only.
 */
export function buildSignalConfig(): SignalConfig {
  const defaultSymbols =
    'BTC,ETH,BNB,SOL,XRP,ADA,DOGE,AVAX,DOT,MATIC,LINK,UNI,ATOM,LTC,BCH,NEAR,ETC,XLM,FIL,APT';

  return {
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27018/crypto_db',
    port: int(process.env.NAYFT_PORT, 4001),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigins: commaList(process.env.NAYFT_CORS_ORIGINS, [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ]),

    defaultExchange: (process.env.NAYFT_EXCHANGE || 'binance').toLowerCase(),
    trackedSymbols: list(process.env.NAYFT_TRACKED_SYMBOLS, defaultSymbols.split(',')),

    priceSpikeThresholdPct: num(process.env.NAYFT_PRICE_SPIKE_PCT, 3),
    volumeMaPeriods: int(process.env.NAYFT_VOLUME_MA_PERIODS, 20),
    volumeSpikeRatio: num(process.env.NAYFT_VOLUME_SPIKE_RATIO, 2),
    newsLookbackHours: num(process.env.NAYFT_NEWS_LOOKBACK_HOURS, 2),
    newsMoveThresholdPct: num(process.env.NAYFT_NEWS_MOVE_PCT, 2),
    dedupWindowMinutes: int(process.env.NAYFT_DEDUP_WINDOW_MINUTES, 15),
    pipelineBatchSize: int(process.env.NAYFT_PIPELINE_BATCH_SIZE, 8),

    cronSchedule: process.env.NAYFT_SIGNAL_CRON || '*/5 * * * *',

    klineHistoryMinutes: int(process.env.NAYFT_KLINE_HISTORY_MINUTES, 45),
  };
}
