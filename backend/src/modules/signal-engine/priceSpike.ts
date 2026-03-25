import type { KlineCandleDto } from '../../data-access/dtos';
import type { SignalConfig } from '../../config/signal.config.types';
import type { CandidateSignal } from './candidate';
import { closeAtOrBeforeIndex } from './klineMath';

/**
 * 5m / 15m close-to-close % vs threshold; one signal per coin per run (stronger window).
 */
export function computePriceSpike(
  coin: string,
  klines: KlineCandleDto[],
  config: SignalConfig
): CandidateSignal | null {
  if (klines.length < 16) return null;

  const sorted = [...klines].sort((a, b) => a.openTime.getTime() - b.openTime.getTime());
  const last = sorted[sorted.length - 1];
  const lastClose = last.close;
  const lastOpen = last.openTime;

  const t5 = new Date(lastOpen.getTime() - 5 * 60 * 1000);
  const t15 = new Date(lastOpen.getTime() - 15 * 60 * 1000);

  const i5 = closeAtOrBeforeIndex(sorted, t5);
  const i15 = closeAtOrBeforeIndex(sorted, t15);
  if (i5 < 0 || i15 < 0) return null;

  const close5 = sorted[i5].close;
  const close15 = sorted[i15].close;
  if (close5 === 0 || close15 === 0) return null;

  const pct5 = ((lastClose - close5) / close5) * 100;
  const pct15 = ((lastClose - close15) / close15) * 100;

  const th = config.priceSpikeThresholdPct;
  const abs5 = Math.abs(pct5);
  const abs15 = Math.abs(pct15);
  if (abs5 < th && abs15 < th) return null;

  const use5 = abs5 >= abs15;
  const pct = use5 ? pct5 : pct15;
  const timeframe = use5 ? '5m' : '15m';

  const strength = Math.min(Math.abs(pct) / (2 * th), 1);

  return {
    coin: coin.toUpperCase(),
    type: 'price_spike',
    strength,
    timestamp: lastOpen,
    meta: {
      timeframe,
      pctChange: Math.round(pct * 100) / 100,
      thresholdPct: th,
    },
  };
}
