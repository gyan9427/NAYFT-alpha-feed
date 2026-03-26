import fs from 'fs';
import type { NormalizedIntelligenceItem, GeneratedTweet, TweetsMeta } from '../types';
import type { NewsIntelligenceRaw } from '../intelligence/loadNewsIntelligence';
import { loadNewsIntelligenceJson, getNewsIntelligenceJsonPath } from '../intelligence/loadNewsIntelligence';
import { normalizeNewsIntelligence } from '../intelligence/normalize';
import { filterIntelligenceItems } from '../selector/filterEngine';
import { selectTopIntelligenceItems } from '../selector/selectorEngine';
import { hookEngine } from '../engine/hookEngine';
import { narrativeEngine } from '../engine/narrativeEngine';
import { formatterEngine } from '../engine/formatterEngine';
import { selectStyleType } from '../engine/styleEngine';
import { rewriteTitle } from '../engine/titleRewriteEngine';
import { fetchAnalyseData } from '../../intelligence/analyseFetcher';

type CacheState = {
  mtimeMs: number;
  items: NormalizedIntelligenceItem[];
};

let cache: CacheState | null = null;
let reloadPromise: Promise<CacheState> | null = null;

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

export async function loadFromLocalJSON(): Promise<NewsIntelligenceRaw> {
  return loadNewsIntelligenceJson(getNewsIntelligenceJsonPath());
}

async function resolveDynamicIntelligence(): Promise<{
  raw: NewsIntelligenceRaw;
  intelligenceSource: 'analyse' | 'local';
}> {
  try {
    return { raw: await fetchAnalyseData(), intelligenceSource: 'analyse' };
  } catch {
    return { raw: await loadFromLocalJSON(), intelligenceSource: 'local' };
  }
}

export async function getIntelligenceData(useDynamic: boolean): Promise<NewsIntelligenceRaw> {
  if (useDynamic) {
    try {
      return await fetchAnalyseData();
    } catch {
      return loadFromLocalJSON();
    }
  }
  return loadFromLocalJSON();
}

function tieredSelectIntelligenceItems(
  normalizedItems: NormalizedIntelligenceItem[],
  limit: number,
  onlyHighlighted: boolean | undefined
): {
  selected: NormalizedIntelligenceItem[];
  highlightFallbackUsed: boolean;
  filterBypassUsed: boolean;
} {
  const filtered = filterIntelligenceItems(normalizedItems);
  let selected = selectTopIntelligenceItems(filtered, {
    limit,
    onlyHighlighted,
  });

  const highlightFallbackUsed =
    onlyHighlighted === true && selected.length === 0 && filtered.length > 0;
  if (highlightFallbackUsed) {
    selected = selectTopIntelligenceItems(filtered, {
      limit,
      onlyHighlighted: false,
    });
  }

  let filterBypassUsed = false;
  if (selected.length === 0 && normalizedItems.length > 0) {
    const fallbackItems = normalizedItems.filter((item) => item.signal?.signalType !== 'none');
    const pool = fallbackItems.length > 0 ? fallbackItems : normalizedItems;
    selected = selectTopIntelligenceItems(pool, {
      limit,
      onlyHighlighted: false,
    });
    filterBypassUsed = true;
  }

  return { selected, highlightFallbackUsed, filterBypassUsed };
}

function generateTweetForItem(item: NormalizedIntelligenceItem, rank: number): GeneratedTweet {
  const styleType = selectStyleType(item);
  const title = rewriteTitle(item);
  const hook = hookEngine(item, styleType, title);
  const narrative = narrativeEngine(item, { hookLine: hook, titleLine: title });
  const tweetText = formatterEngine({ hook, title, narrative, coin: item.coin });

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
  useDynamicIntelligence?: boolean;
}): Promise<{
  tweets: GeneratedTweet[];
  meta: TweetsMeta;
}> {
  const { limit, onlyHighlighted, useDynamicIntelligence } = params;

  if (useDynamicIntelligence) {
    const { raw, intelligenceSource } = await resolveDynamicIntelligence();
    const normalizedItems = normalizeNewsIntelligence(raw);

    const { selected, highlightFallbackUsed, filterBypassUsed } = tieredSelectIntelligenceItems(
      normalizedItems,
      limit,
      onlyHighlighted
    );

    const tweets = selected.map((it, idx) => generateTweetForItem(it, idx + 1));

    return {
      tweets,
      meta: {
        limit,
        totalItemsConsidered: normalizedItems.length,
        returnedCount: tweets.length,
        onlyHighlighted,
        generatedAtUtc: new Date().toISOString(),
        intelligenceSource,
        highlightFallbackUsed,
        filterBypassUsed,
      },
    };
  }

  const cacheState = await getNormalizedItems();

  const { selected, highlightFallbackUsed, filterBypassUsed } = tieredSelectIntelligenceItems(
    cacheState.items,
    limit,
    onlyHighlighted
  );

  const tweets = selected.map((it, idx) => generateTweetForItem(it, idx + 1));

  return {
    tweets,
    meta: {
      limit,
      totalItemsConsidered: cacheState.items.length,
      returnedCount: tweets.length,
      onlyHighlighted,
      generatedAtUtc: new Date().toISOString(),
      highlightFallbackUsed,
      filterBypassUsed,
    },
  };
}

// Exposed for future debugging; not used by the current API layer.
export function getCacheDebug(): unknown {
  if (!cache) return { loaded: false };
  return { loaded: true, mtimeMs: cache.mtimeMs, itemCount: cache.items.length };
}
