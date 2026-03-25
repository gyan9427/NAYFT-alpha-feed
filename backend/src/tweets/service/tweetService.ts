import fs from 'fs';
import type { NormalizedIntelligenceItem, GeneratedTweet } from '../types';
import type { NewsIntelligenceRaw } from '../intelligence/loadNewsIntelligence';
import { loadNewsIntelligenceJson, getNewsIntelligenceJsonPath } from '../intelligence/loadNewsIntelligence';
import { normalizeNewsIntelligence } from '../intelligence/normalize';
import { selectTopIntelligenceItems } from '../selector/selectorEngine';
import { hookEngine } from '../engine/hookEngine';
import { narrativeEngine } from '../engine/narrativeEngine';
import { formatterEngine } from '../engine/formatterEngine';

type CacheState = {
  mtimeMs: number;
  items: NormalizedIntelligenceItem[];
};

let cache: CacheState | null = null;
let reloadPromise: Promise<CacheState> | null = null;

function jsonMetaForError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) return { message: err.message, name: err.name };
  return { error: String(err) };
}

async function loadAndNormalize(jsonPath: string): Promise<CacheState> {
  const stat = await fs.promises.stat(jsonPath);
  const mtimeMs = stat.mtimeMs;
  const raw: NewsIntelligenceRaw = await loadNewsIntelligenceJson(jsonPath);
  const items = normalizeNewsIntelligence(raw);
  return { mtimeMs, items };
}

async function getNormalizedItems(): Promise<CacheState> {
  const jsonPath = getNewsIntelligenceJsonPath();
  const stat = await fs.promises.stat(jsonPath);
  const currentMtimeMs = stat.mtimeMs;

  if (cache && cache.mtimeMs === currentMtimeMs) return cache;
  if (reloadPromise) return reloadPromise;

  reloadPromise = loadAndNormalize(jsonPath)
    .then((next) => {
      cache = next;
      return next;
    })
    .finally(() => {
      reloadPromise = null;
    });

  return reloadPromise;
}

function generateTweetForItem(item: NormalizedIntelligenceItem, rank: number): GeneratedTweet {
  const hook = hookEngine(item);
  const narrative = narrativeEngine(item);
  const tweetText = formatterEngine({ hook, narrative });

  return {
    id: item.id,
    coin: item.coin,
    rank,
    score: item.score,
    tweetText,
    meta: {
      direction: item.signal?.direction,
      signalType: item.signal?.signalType,
      strengthLabel: item.signal?.strengthLabel,
      timing: item.signal?.timing,
      watchIntensity: item.signal?.watchIntensity,
    },
  };
}

export async function getGeneratedTweets(params: {
  limit: number;
  onlyHighlighted?: boolean;
}): Promise<{
  tweets: GeneratedTweet[];
  meta: {
    limit: number;
    totalItemsConsidered: number;
    returnedCount: number;
    onlyHighlighted?: boolean;
    generatedAtUtc: string;
  };
}> {
  const { limit, onlyHighlighted } = params;
  const cacheState = await getNormalizedItems();

  const selected = selectTopIntelligenceItems(cacheState.items, {
    limit,
    onlyHighlighted,
  });

  const tweets = selected.map((it, idx) => generateTweetForItem(it, idx + 1));

  return {
    tweets,
    meta: {
      limit,
      totalItemsConsidered: cacheState.items.length,
      returnedCount: tweets.length,
      onlyHighlighted,
      generatedAtUtc: new Date().toISOString(),
    },
  };
}

// Exposed for future debugging; not used by the current API layer.
export function getCacheDebug(): unknown {
  if (!cache) return { loaded: false };
  return { loaded: true, mtimeMs: cache.mtimeMs, itemCount: cache.items.length };
}

