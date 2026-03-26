import type { NormalizedIntelligenceItem } from '../types';
import { compressNarrative, type NarrativeContext } from './narrativeCompression';

export type { NarrativeContext };

/**
 * Single-line narrative for tweets: compress implication + interpretation (+ fallbacks)
 * into 1–2 clear sentences (deterministic, no LLM).
 */
export function narrativeEngine(item: NormalizedIntelligenceItem, context?: NarrativeContext): string {
  return compressNarrative(item, context);
}
