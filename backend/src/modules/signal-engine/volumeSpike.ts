import type { KlineCandleDto } from '../../data-access/dtos';
import type { SignalConfig } from '../../config/signal.config.types';
import type { CandidateSignal } from './candidate';
import { mean } from './klineMath';

export function computeVolumeSpike(
  coin: string,
  klines: KlineCandleDto[],
  config: SignalConfig
): CandidateSignal | null {
  const n = config.volumeMaPeriods;
  if (klines.length < n + 2) return null;

  const sorted = [...klines].sort((a, b) => a.openTime.getTime() - b.openTime.getTime());
  const last = sorted[sorted.length - 1];
  const currentVol = last.volume;
  const prev = sorted.slice(0, -1);
  const window = prev.slice(-n);
  const ma = mean(window.map((k) => k.volume));
  if (ma === 0) return null;

  const ratio = currentVol / ma;
  if (ratio < config.volumeSpikeRatio) return null;

  const strength = Math.min((ratio - 1) / (2 * config.volumeSpikeRatio - 1), 1);

  return {
    coin: coin.toUpperCase(),
    type: 'volume_spike',
    strength,
    timestamp: last.openTime,
    meta: {
      ratio: Math.round(ratio * 100) / 100,
      movingAverageVolume: Math.round(ma * 1e6) / 1e6,
      currentVolume: currentVol,
      periods: n,
    },
  };
}
