import type { NormalizedIntelligenceItem } from '../types';
import { compressNarrative, type NarrativeContext } from './narrativeCompression';

export type { NarrativeContext };

function stableHash(str: string): number {
  // FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function generateLowSignalNarrative(item: NormalizedIntelligenceItem): string {
  const templates = [
    "There's no strong directional signal here yet - this looks more like background noise than a clear setup.",
    'No clear edge from this alone - better to wait for stronger confirmation before acting.',
    "This doesn't offer a strong signal yet - more context is needed before forming a view.",
    "So far, this looks inconclusive - not enough to justify a trade decision.",
  ];
  return templates[stableHash(`${item.id}|lowSignalNarrative`) % templates.length];
}

/**
 * Single-line narrative for tweets: compress implication + interpretation (+ fallbacks)
 * into 1–2 clear sentences (deterministic, no LLM).
 */
export function narrativeEngine(
  item: NormalizedIntelligenceItem,
  context?: NarrativeContext,
  options?: { isLowSignalMode?: boolean },
): string {
  const isLowSignalMode = options?.isLowSignalMode === true;

  if (isLowSignalMode) {
    return generateLowSignalNarrative(item);
  }

  return compressNarrative(item, context);
}
