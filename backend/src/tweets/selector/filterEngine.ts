import type { NormalizedIntelligenceItem } from '../types';

export function filterIntelligenceItems(items: NormalizedIntelligenceItem[]): NormalizedIntelligenceItem[] {
  return items.filter((item) => {
    const sig = item.signal;
    const signalType = sig?.signalType;
    const strengthLabel = sig?.strengthLabel;
    const confidence = sig?.confidence;

    // Required filter rules
    if (signalType === 'none') return false;
    if (strengthLabel === 'weak') return false;

    // If available, exclude low confidence.
    if (typeof confidence === 'number' && Number.isFinite(confidence) && confidence < 0.5) return false;

    return true;
  });
}

