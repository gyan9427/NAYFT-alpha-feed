import type { NormalizedIntelligenceItem } from '../types';
import type { TweetStyleType } from './styleEngine';

export type HookIntensity = 'low' | 'medium' | 'high';

type HookTier = {
  low: string[];
  medium: string[];
  high: string[];
};

type HookCategory = 'curiosity' | 'contrarian' | 'alert';

const templatesByCategory: Record<HookCategory, HookTier> = {
  curiosity: {
    low: [
      'Keep an eye on {coin} right now.',
      '{coin} is showing some early signs of movement.',
      '{coin} is quietly doing something worth watching.',
    ],
    medium: [
      'Something about {coin} is starting to look different.',
      'This move in {coin} might be more important than it seems.',
      '{coin} is acting like it might be ahead of expectations.',
    ],
    high: [
      'Something about {coin} isn\'t adding up right now...',
      'This move in {coin} doesn\'t look normal.',
      'Something unusual is happening with {coin} right now.',
    ],
  },
  alert: {
    low: [
      '{coin} might be setting up for a move.',
      '{coin} is starting to wake up.',
      '{coin} is on the radar again.',
    ],
    medium: [
      '{coin} might be setting up for a move.',
      'Keep an eye on {coin}: the {strength} setup is getting clearer.',
      '{coin} is showing early signs of momentum.',
    ],
    high: [
      'Pay attention to {coin} here.',
      '{coin} is flashing a stronger signal than it looks.',
      '{coin} is moving like this isn\'t over yet.',
    ],
  },
  contrarian: {
    low: [
      'Most people are ignoring {coin} right now.',
      '{coin} looks quiet... which is usually when it gets interesting.',
      '{coin} is one to keep on the watchlist today.',
    ],
    medium: [
      'Everyone thinks {coin} is {strength} right now.',
      'The crowd is leaning one way on {coin}.',
      'This is where people usually misread {coin}.',
    ],
    high: [
      'Everyone is looking at {coin} wrong right now.',
      'If {coin} already looks {direction}, that\'s often when the market flips.',
      'That\'s exactly why {coin} might move the other way.',
    ],
  },
};

function stableHash(str: string): number {
  // FNV-1a 32-bit (deterministic across runs; fast + good distribution for indexing)
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // Make it non-negative
  return hash >>> 0;
}

function pickCategory(styleType: TweetStyleType): HookCategory {
  if (styleType === 'contrarian') return 'contrarian';
  if (styleType === 'alert') return 'alert';
  return 'curiosity';
}

function strengthForTemplate(item: NormalizedIntelligenceItem): string {
  // Prefer the provided label ("weak", "moderate", etc.) so templates stay aligned with the dataset.
  const label = item.signal?.strengthLabel;
  if (label && label.trim()) return label.trim();

  const strength = item.signal?.strength;
  if (typeof strength === 'number' && Number.isFinite(strength)) return strength.toFixed(2);

  return 'moderate';
}

function fillTemplate(template: string, vars: { coin: string; direction?: string; strength: string }): string {
  return template
    .replaceAll('{coin}', vars.coin)
    .replaceAll('{direction}', vars.direction ?? '')
    .replaceAll('{strength}', vars.strength);
}

export function selectHookOpening(params: {
  item: NormalizedIntelligenceItem;
  styleType: TweetStyleType;
  intensity: HookIntensity;
}): string {
  const { item, styleType, intensity } = params;
  const coin = item.coin;
  const direction = item.signal?.direction ?? 'unclear';
  const strength = strengthForTemplate(item);

  const category = pickCategory(styleType);
  const templates = templatesByCategory[category][intensity];

  const index = stableHash(`${item.id}|${styleType}|${direction}|${intensity}`) % templates.length;
  const template = templates[index];

  return fillTemplate(template, { coin, direction, strength });
}

