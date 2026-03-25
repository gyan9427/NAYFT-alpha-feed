import type { CandidateSignal } from '../signal-engine/candidate';

function line(...parts: string[]): string {
  return parts.join('\n');
}

/**
 * Rule-based insight text from a candidate signal (pure).
 */
export function generateInsight(signal: CandidateSignal): string {
  const coin = signal.coin;

  switch (signal.type) {
    case 'price_spike': {
      const pct = Number(signal.meta.pctChange ?? 0);
      const tf = String(signal.meta.timeframe ?? '5m');
      return line(
        `${coin} moved ${pct}% in last ${tf}`,
        '→ Indicates strong momentum',
        '→ Traders may expect continuation'
      );
    }
    case 'volume_spike': {
      const ratio = Number(signal.meta.ratio ?? 0);
      return line(
        `${coin} volume surged ${ratio}x above average`,
        '→ Suggests accumulation or distribution',
        '→ Watch for breakout or reversal'
      );
    }
    case 'news_impact':
      return line(
        `${coin} reacted to recent news`,
        '→ Market shows sensitivity to narrative',
        '→ Short-term volatility likely'
      );
    default:
      return `${coin} signal`;
  }
}
