import type { NewsArticleDto } from '../../data-access/dtos';
import type { SignalConfig } from '../../config/signal.config.types';
import type { CandidateSignal } from './candidate';

export function computeNewsImpact(params: {
  coin: string;
  article: NewsArticleDto;
  baselineClose: number;
  latestClose: number;
  asOf: Date;
  config: SignalConfig;
}): CandidateSignal | null {
  const { coin, article, baselineClose, latestClose, asOf, config } = params;
  if (baselineClose === 0) return null;

  const pct = ((latestClose - baselineClose) / baselineClose) * 100;
  if (Math.abs(pct) < config.newsMoveThresholdPct) return null;

  const strength = Math.min(Math.abs(pct) / (2 * config.newsMoveThresholdPct), 1);

  return {
    coin: coin.toUpperCase(),
    type: 'news_impact',
    strength,
    timestamp: asOf,
    meta: {
      newsId: article.id,
      title: article.title,
      publishedAt: article.publishedAt.toISOString(),
      priceChangePct: Math.round(pct * 100) / 100,
    },
  };
}
