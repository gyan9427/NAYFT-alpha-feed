import type { NormalizedIntelligenceItem } from '../types';

export type TweetStyleType = 'alert' | 'insight' | 'contrarian';

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function getConfidence(item: NormalizedIntelligenceItem): number | undefined {
  const c = item.signal?.confidence;
  return isFiniteNumber(c) ? c : undefined;
}

function getStrength(item: NormalizedIntelligenceItem): number | undefined {
  const s = item.signal?.strength;
  return isFiniteNumber(s) ? s : undefined;
}

function getStrengthLabel(item: NormalizedIntelligenceItem): string | undefined {
  return item.signal?.strengthLabel;
}

export function selectStyleType(item: NormalizedIntelligenceItem): TweetStyleType {
  const sig = item.signal;

  const signalType = (sig?.signalType ?? '').toLowerCase();
  const direction = (sig?.direction ?? '').toLowerCase();

  const confidence = getConfidence(item);
  const strength = getStrength(item);
  const strengthLabel = getStrengthLabel(item);

  // "Hybrid" strong-signal logic:
  // - confidence >= 0.7
  // - OR (numeric strength is high enough AND strength_label indicates moderate)
  const strongFromConfidence = typeof confidence === 'number' && confidence >= 0.7;
  const strongFromStrength =
    strengthLabel === 'moderate' && typeof strength === 'number' && strength >= 0.55;

  const strongSignal = strongFromConfidence || strongFromStrength;

  if (signalType === 'early') return 'insight';
  if (strongSignal) return 'contrarian';

  // Keep "confirmed" as the explicit alert style, matching the plan.
  if (signalType === 'confirmed') return 'alert';

  // Everything else falls back to insight (still deterministic and non-empty).
  // Direction is currently not used here, but leaving it in keeps this a stable extension point.
  void direction;
  return 'insight';
}

