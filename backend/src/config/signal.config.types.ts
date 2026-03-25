export type SignalConfig = {
  mongoUri: string;
  port: number;
  nodeEnv: string;
  corsOrigins: string[];

  defaultExchange: string;
  trackedSymbols: string[];

  priceSpikeThresholdPct: number;
  volumeMaPeriods: number;
  volumeSpikeRatio: number;
  newsLookbackHours: number;
  newsMoveThresholdPct: number;
  dedupWindowMinutes: number;
  pipelineBatchSize: number;

  cronSchedule: string;

  /** How far back to pull 1m klines per coin. */
  klineHistoryMinutes: number;
};
