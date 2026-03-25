/** Plain shapes passed to signal-engine (no Mongoose). */

export type KlineCandleDto = {
  openTime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type NewsArticleDto = {
  id: string;
  title: string;
  publishedAt: Date;
  coinSymbols: string[];
};

export type NayftSignalType = 'price_spike' | 'volume_spike' | 'news_impact';

export type NayftSignalDoc = {
  coin: string;
  type: NayftSignalType;
  strength: number;
  timestamp: Date;
  meta: Record<string, unknown>;
  insight: string;
};
