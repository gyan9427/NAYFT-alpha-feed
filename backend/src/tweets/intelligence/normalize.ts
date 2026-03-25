import type { NewsIntelligenceRaw } from './loadNewsIntelligence';
import type { NormalizedIntelligenceItem } from '../types';

function asObject(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function asString(v: unknown): string | undefined {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return undefined;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function asBoolean(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  return undefined;
}

export function normalizeNewsIntelligence(raw: NewsIntelligenceRaw): NormalizedIntelligenceItem[] {
  const items = raw.items ?? [];
  const out: NormalizedIntelligenceItem[] = [];

  for (const item of items) {
    const obj = asObject(item);
    if (!obj) continue;

    const id = asString(obj.news_id ?? obj.id);
    const coin = asString(obj.primary_coin ?? obj.coin);
    const title = asString(obj.title);
    if (!id || !coin || !title) continue;

    const signalObj = asObject(obj.signal);

    out.push({
      id,
      coin,
      title,
      publishedAtUtc: asString(obj.published_at_utc),

      score: asNumber(obj.score),
      intelligentRank: asNumber(obj.intelligent_rank),
      originalRank: asNumber(obj.original_rank),
      priorityTotal: asNumber(obj.priority_total),
      reason: asString(obj.reason),

      signal: signalObj
        ? {
            signalType: asString(signalObj.signal_type),
            direction: asString(signalObj.direction),
            confidence: asNumber(signalObj.confidence),
            strength: asNumber(signalObj.strength),
            strengthLabel: asString(signalObj.strength_label),
            timing: asString(signalObj.timing),
            watchIntensity: asString(signalObj.watch_intensity),
            implication: asString(signalObj.implication),
            interpretation: asString(signalObj.interpretation),
            reasoning: asString(signalObj.reasoning),
            horizonUsed: (signalObj.horizon_used === null ? null : asString(signalObj.horizon_used)),
            highlight: asBoolean(signalObj.highlight),
          }
        : undefined,

      raw: item,
    });
  }

  return out;
}

