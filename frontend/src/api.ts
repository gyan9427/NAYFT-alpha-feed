const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001';

export type NayftSignal = {
  coin: string;
  type: string;
  strength: number;
  timestamp: string;
  meta: Record<string, unknown>;
  insight: string;
};

type ApiOk = { success: true; data: NayftSignal[] };

export type NayftTweet = {
  id: string;
  coin: string;
  rank: number;
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

type ApiOkTweets = { success: true; data: NayftTweet[] };

export type AnalyseTweetsMeta = {
  limit?: number;
  totalItemsConsidered?: number;
  returnedCount?: number;
  onlyHighlighted?: boolean;
  generatedAtUtc?: string;
  intelligenceSource?: 'analyse' | 'local';
  highlightFallbackUsed?: boolean;
  filterBypassUsed?: boolean;
};

export async function fetchSignals(limit = 50): Promise<NayftSignal[]> {
  const r = await fetch(`${base}/nayft/signals?limit=${limit}`);
  const j = (await r.json()) as ApiOk | { success: false };
  if (!r.ok || !('data' in j)) throw new Error('Failed to load signals');
  return j.data;
}

export async function fetchSignalsByCoin(coin: string, limit = 50): Promise<NayftSignal[]> {
  const enc = encodeURIComponent(coin);
  const r = await fetch(`${base}/nayft/signals/${enc}?limit=${limit}`);
  const j = (await r.json()) as ApiOk | { success: false };
  if (!r.ok || !('data' in j)) throw new Error('Failed to load signals');
  return j.data;
}

export async function fetchTweets(limit = 10): Promise<NayftTweet[]> {
  const r = await fetch(`${base}/nayft/tweets?limit=${limit}`);
  const j = (await r.json()) as ApiOkTweets | { success: false };
  if (!r.ok || !('data' in j)) throw new Error('Failed to load tweets');
  return j.data;
}

export async function fetchTopTweets(limit = 5): Promise<NayftTweet[]> {
  const r = await fetch(`${base}/nayft/tweets/top?limit=${limit}`);
  const j = (await r.json()) as ApiOkTweets | { success: false };
  if (!r.ok || !('data' in j)) throw new Error('Failed to load top tweets');
  return j.data;
}

export async function postAnalyseTweets(limit = 10): Promise<{
  tweets: NayftTweet[];
  meta?: AnalyseTweetsMeta;
}> {
  const r = await fetch(`${base}/nayft/tweets/analyse?limit=${limit}`, { method: 'POST' });
  const j = (await r.json()) as
    | { success: true; data: NayftTweet[]; meta?: AnalyseTweetsMeta }
    | { success: false };
  if (!r.ok || !('data' in j)) throw new Error('Failed to generate tweets from analyse');
  return { tweets: j.data, meta: j.meta };
}
