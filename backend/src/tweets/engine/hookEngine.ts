import type { NormalizedIntelligenceItem } from '../types';
import type { TweetStyleType } from './styleEngine';
import { selectHookOpening } from './hookTemplates';

export function hookEngine(item: NormalizedIntelligenceItem, styleType: TweetStyleType): string {
  const hookOpening = selectHookOpening(item, styleType);

  // Keep the original title text as-is to avoid changing factual meaning.
  return [hookOpening, item.title].filter(Boolean).join('\n');
}

