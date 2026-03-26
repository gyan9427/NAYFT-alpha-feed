import type { NormalizedIntelligenceItem } from '../types';
import type { TweetStyleType } from './styleEngine';
import { selectHookFromLibrary, type HookIntensity } from './hookLibrary';

/**
 * @param rewrittenTitle Optional rewritten title line so hooks align with timeline (e.g. reaction hooks after a move).
 */
export function hookEngine(
  item: NormalizedIntelligenceItem,
  styleType: TweetStyleType,
  rewrittenTitle?: string,
): string {
  const confidence = item.signal?.confidence;
  const direction = item.signal?.direction;
  const signalType = item.signal?.signalType;

  let intensity: HookIntensity = 'low';
  if (typeof confidence === 'number' && Number.isFinite(confidence)) {
    if (confidence >= 0.75) intensity = 'high';
    else if (confidence >= 0.6) intensity = 'medium';
  }

  // Gate HIGH intensity to avoid over-hype on neutral/none signals.
  if (intensity === 'high') {
    if (direction === 'neutral' || signalType === 'none') intensity = 'medium';
  }

  return selectHookFromLibrary({ item, styleType, intensity, rewrittenTitle });
}

