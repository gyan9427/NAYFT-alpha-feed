export type NormalizedIntelligenceItem = {
  id: string; // news_id
  coin: string; // primary_coin
  title: string;
  publishedAtUtc?: string; // published_at_utc

  // Intelligence/ranking fields
  score?: number; // item.score (0..1-ish)
  intelligentRank?: number; // item.intelligent_rank (lower is better)
  originalRank?: number;
  priorityTotal?: number; // item.priority_total
  reason?: string; // item.reason

  // Narrative/signal fields (already computed by the lab)
  signal?: {
    signalType?: string; // item.signal.signal_type
    direction?: string; // item.signal.direction
    confidence?: number; // item.signal.confidence
    strength?: number; // item.signal.strength
    strengthLabel?: string; // item.signal.strength_label
    timing?: string; // item.signal.timing
    watchIntensity?: string; // item.signal.watch_intensity
    implication?: string; // item.signal.implication
    interpretation?: string; // item.signal.interpretation
    reasoning?: string; // item.signal.reasoning
    horizonUsed?: string | null; // item.signal.horizon_used
    highlight?: boolean; // item.signal.highlight
  };

  // Keep a reference to the raw record for debugging; do not use for tweet generation logic.
  raw: unknown;
};

export type GeneratedTweet = {
  id: string;
  coin: string;
  rank: number; // computed by selector (1-based)
  score?: number;
  tweetText: string;
  meta?: {
    direction?: string;
    signalType?: string;
    strengthLabel?: string;
    timing?: string;
    watchIntensity?: string;
  };
};

