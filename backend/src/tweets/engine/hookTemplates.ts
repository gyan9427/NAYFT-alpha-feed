import type { NormalizedIntelligenceItem } from '../types';
import type { TweetStyleType } from './styleEngine';

type HookCategory = 'curiosity' | 'contrarian' | 'alert';

const curiosityTemplates: string[] = [
  'Something unusual is happening with {coin} right now.',
  'This move in {coin} doesn\'t look normal.',
  '{coin} is acting like it might be ahead of expectations.',
];

const contrarianTemplates: string[] = [
  'Everyone thinks {coin} is {strength} right now.',
  'That\'s exactly why {coin} might move the other way.',
  'If {coin} already looks {direction}, that\'s often when the market flips.',
];

const alertTemplates: string[] = [
  '{coin} might be setting up for a move.',
  '{coin} is showing early signs of momentum.',
  'Keep an eye on {coin}: the {strength} setup is getting clearer.',
];

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

export function selectHookOpening(item: NormalizedIntelligenceItem, styleType: TweetStyleType): string {
  const coin = item.coin;
  const direction = item.signal?.direction ?? 'unclear';
  const strength = strengthForTemplate(item);

  const category = pickCategory(styleType);
  const templates =
    category === 'curiosity' ? curiosityTemplates : category === 'contrarian' ? contrarianTemplates : alertTemplates;

  const index = stableHash(`${item.id}|${styleType}|${direction ?? ''}`) % templates.length;
  const template = templates[index];

  return fillTemplate(template, { coin, direction, strength });
}

