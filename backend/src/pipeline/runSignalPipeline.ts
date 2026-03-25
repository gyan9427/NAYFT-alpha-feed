import type { SignalConfig } from '../config/signal.config.types';
import { klinesRepo } from '../data-access/klines.repo';
import { newsRepo } from '../data-access/news.repo';
import { coinsRepo } from '../data-access/coins.repo';
import { signalsRepo } from '../data-access/signals.repo';
import type { CandidateSignal } from '../modules/signal-engine';
import {
  computePriceSpike,
  computeVolumeSpike,
  computeNewsImpact,
} from '../modules/signal-engine';
import { generateInsight } from '../modules/content-engine/content.service';
import type { NayftSignalDoc } from '../data-access/dtos';
import { logger } from '../utils/logger';

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function uniqKey(c: CandidateSignal): string {
  return `${c.coin}:${c.type}`;
}

export type PipelineRunResult = {
  candidates: number;
  inserted: number;
  skippedDedup: number;
  errors: number;
  durationMs: number;
};

export async function runSignalPipeline(config: SignalConfig): Promise<PipelineRunResult> {
  const started = Date.now();
  const exchange = config.defaultExchange;
  const now = new Date();
  const from = new Date(now.getTime() - config.klineHistoryMinutes * 60 * 1000);
  const newsSince = new Date(now.getTime() - config.newsLookbackHours * 60 * 60 * 1000);
  const dedupSince = new Date(now.getTime() - config.dedupWindowMinutes * 60 * 1000);

  const tracked = new Set(config.trackedSymbols.map((s) => s.toUpperCase()));
  let universe: string[] = [];
  try {
    const fromDb = await coinsRepo.listDistinctBaseAssets();
    universe = fromDb.filter((c) => tracked.has(c));
  } catch (e) {
    logger.error({ err: e }, 'coinsRepo.listDistinctBaseAssets failed');
  }
  if (universe.length === 0) {
    universe = [...config.trackedSymbols.map((s) => s.toUpperCase())];
  }

  const candidates: CandidateSignal[] = [];
  let errors = 0;

  const batches = chunk(universe, config.pipelineBatchSize);
  for (const batch of batches) {
    await Promise.all(
      batch.map(async (coin) => {
        try {
          const klines = await klinesRepo.find1mKlines({
            exchange,
            symbol: coin,
            from,
            to: now,
          });
          const p = computePriceSpike(coin, klines, config);
          const v = computeVolumeSpike(coin, klines, config);
          if (p) candidates.push(p);
          if (v) candidates.push(v);
        } catch (e) {
          errors += 1;
          logger.warn({ err: e, coin }, 'batch coin pipeline slice failed');
        }
      })
    );
  }

  try {
    const articles = await newsRepo.findPublishedSince({ since: newsSince });
    const uniSet = new Set(universe);
    for (const article of articles) {
      for (const coin of article.coinSymbols) {
        if (!uniSet.has(coin)) continue;
        try {
          const baseline = await klinesRepo.findCloseAtOrBefore({
            exchange,
            symbol: coin,
            at: article.publishedAt,
          });
          const klines = await klinesRepo.find1mKlines({
            exchange,
            symbol: coin,
            from: article.publishedAt,
            to: now,
          });
          if (baseline == null || klines.length === 0) continue;
          const last = klines[klines.length - 1];
          const n = computeNewsImpact({
            coin,
            article,
            baselineClose: baseline,
            latestClose: last.close,
            asOf: last.openTime,
            config,
          });
          if (n) candidates.push(n);
        } catch (e) {
          errors += 1;
          logger.warn({ err: e, coin, articleId: article.id }, 'news impact slice failed');
        }
      }
    }
  } catch (e) {
    errors += 1;
    logger.error({ err: e }, 'news fetch failed');
  }

  const seen = new Set<string>();
  const unique: CandidateSignal[] = [];
  for (const c of candidates) {
    const k = uniqKey(c);
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(c);
  }

  const docs: NayftSignalDoc[] = [];
  let skippedDedup = 0;

  for (const c of unique) {
    try {
      const exists = await signalsRepo.existsRecent({
        coin: c.coin,
        type: c.type,
        since: dedupSince,
      });
      if (exists) {
        skippedDedup += 1;
        continue;
      }
      const insight = generateInsight(c);
      docs.push({
        coin: c.coin,
        type: c.type,
        strength: c.strength,
        timestamp: c.timestamp,
        meta: c.meta,
        insight,
      });
    } catch (e) {
      errors += 1;
      logger.warn({ err: e, coin: c.coin, type: c.type }, 'dedup or insight failed');
    }
  }

  let inserted = 0;
  if (docs.length > 0) {
    try {
      inserted = await signalsRepo.insertMany(docs);
    } catch (e) {
      errors += 1;
      logger.error({ err: e }, 'signalsRepo.insertMany failed');
    }
  }

  const durationMs = Date.now() - started;
  logger.info(
    {
      candidates: unique.length,
      inserted,
      skippedDedup,
      errors,
      durationMs,
    },
    'runSignalPipeline completed'
  );

  return {
    candidates: unique.length,
    inserted,
    skippedDedup,
    errors,
    durationMs,
  };
}
