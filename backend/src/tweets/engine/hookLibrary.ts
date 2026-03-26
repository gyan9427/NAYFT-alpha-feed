import type { NormalizedIntelligenceItem } from '../types';
import type { TweetStyleType } from './styleEngine';

export type HookIntensity = 'low' | 'medium' | 'high';

/** Intent buckets for template selection. */
export type HookLibraryKind = 'curiosity' | 'contrarian' | 'alert' | 'tension' | 'reaction' | 'risk';

type Tier = Record<HookIntensity, string[]>;

export function stableHash(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function strengthForTemplate(item: NormalizedIntelligenceItem): string {
  const label = item.signal?.strengthLabel;
  if (label && label.trim()) return label.trim();
  const strength = item.signal?.strength;
  if (typeof strength === 'number' && Number.isFinite(strength)) return strength.toFixed(2);
  return 'moderate';
}

function fillTemplate(
  template: string,
  vars: { coin: string; direction?: string; strength: string },
): string {
  return template
    .replaceAll('{coin}', vars.coin)
    .replaceAll('{direction}', vars.direction ?? '')
    .replaceAll('{strength}', vars.strength);
}

/** Title already rewritten: detect post-move / reaction context. */
export function titleIndicatesPastMovement(title: string): boolean {
  const t = title.toLowerCase();
  return (
    /\b(just|moved|dropped|surged|spiked|reacted|gained|fell|crashed|rally|jumped|slid|pump|dump|rallied|plunged)\b/i.test(
      t,
    ) || /\d+\s*%/i.test(t)
  );
}

export function titleIndicatesRiskOrWarning(title: string): boolean {
  return /\b(risky|liquidation|liquidations|danger|ban|lawsuit|hack|exploit|selloff|capitulation|warning)\b/i.test(
    title,
  );
}

/**
 * 24+ distinct templates across 6 intents x intensity tiers.
 * Selection: hash(item.id + styleType + intensity + kind)
 */
const HOOK_LIBRARY: Record<HookLibraryKind, Tier> = {
  curiosity: {
    low: [
      'Something about {coin} is starting to shift.',
      'Keep a close read on {coin} here.',
      '{coin} is quietly lining up something worth watching.',
    ],
    medium: [
      'There is something unusual happening with {coin} right now.',
      'This move in {coin} feels different than the usual noise.',
      '{coin} is starting to look more interesting than the tape suggests.',
    ],
    high: [
      'Something about {coin} is not lining up with the obvious story.',
      'This price action in {coin} deserves a harder look.',
      '{coin} is doing something that usually matters more than people think.',
    ],
  },
  contrarian: {
    low: [
      'Most traders are probably reading {coin} too fast here.',
      'The consensus take on {coin} might be too clean.',
      '{coin} is the kind of setup where crowds get sloppy.',
    ],
    medium: [
      'Everyone is looking at {coin} wrong right now.',
      'Most traders are misreading {coin} here.',
      'This is where people usually get {coin} wrong.',
    ],
    high: [
      'Everyone is looking at {coin} wrong right now.',
      'If {coin} already looks {direction}, that is often when the market flips.',
      'That is exactly why {coin} might move the other way.',
    ],
  },
  alert: {
    low: [
      '{coin} is starting to show early signs of a move.',
      '{coin} might be entering an important zone.',
      '{coin} is setting up for something bigger.',
    ],
    medium: [
      '{coin} is starting to show early signs of a move.',
      '{coin} might be entering an important zone.',
      'Volatility in {coin} is picking up in a way that matters.',
    ],
    high: [
      '{coin} is flashing a stronger signal than the surface story.',
      '{coin} is moving like this is not done yet.',
      'Pay attention to {coin}: the {strength} read is getting louder.',
    ],
  },
  tension: {
    low: [
      'This does not look like a normal move in {coin}.',
      '{coin} is behaving in a way that usually leads to surprises.',
      'Something about this {coin} move does not add up.',
    ],
    medium: [
      'This does not look like a normal move in {coin}.',
      '{coin} is behaving in a way that usually leads to surprises.',
      'Something about this {coin} move does not add up.',
    ],
    high: [
      'Something about {coin} is not adding up right now.',
      'This move in {coin} does not look normal.',
      '{coin} is moving like someone is wrong about the narrative.',
    ],
  },
  reaction: {
    low: [
      '{coin} just made a move... but something feels off.',
      'That move in {coin} might not mean what people think.',
      '{coin} just reacted—but the real story might be different.',
    ],
    medium: [
      '{coin} just made a move... but something feels off.',
      'That reaction in {coin} might not match the headline.',
      '{coin} moved—now watch what happens next, not what people say.',
    ],
    high: [
      '{coin} just moved in a way that usually fakes people out.',
      'That {coin} reaction might be the start of a different trade.',
      '{coin} just printed a move—do not trust the simple explanation.',
    ],
  },
  risk: {
    low: [
      'This could be a risky moment for {coin}.',
      '{coin} might be entering a dangerous phase.',
      'This setup in {coin} has trap potential.',
    ],
    medium: [
      'This could be a risky moment for {coin}.',
      '{coin} might be entering a dangerous phase.',
      'This setup in {coin} has trap potential.',
    ],
    high: [
      'This could be a risky moment for {coin}.',
      '{coin} might be entering a dangerous phase.',
      'This is the kind of {coin} tape that punishes late confidence.',
    ],
  },
};

export const lowSignalHooks: string[] = [
  'Not much clarity on {coin} right now.',
  "This {coin} update doesn't point to a clear direction yet.",
  "Still early - {coin} isn't showing a strong signal.",
  'No strong signal on {coin} yet - just noise so far.',
  '{coin} is moving, but without clear intent.',
  'Hard to draw a conclusion on {coin} from this alone.',
  'This {coin} move lacks conviction so far.',
  'Nothing decisive on {coin} yet.',
];

export function selectLowSignalHook(item: NormalizedIntelligenceItem): string {
  const templates = lowSignalHooks;
  const index = stableHash(`${item.id}|lowSignalHook`) % templates.length;
  return fillTemplate(templates[index], { coin: item.coin, strength: strengthForTemplate(item) });
}

function pickKind(
  item: NormalizedIntelligenceItem,
  styleType: TweetStyleType,
  intensity: HookIntensity,
  rewrittenTitle: string | undefined,
): HookLibraryKind {
  const title = (rewrittenTitle ?? '').trim();
  const h = stableHash(`${item.id}|${styleType}|${intensity}|kind`);

  if (title && titleIndicatesRiskOrWarning(title)) {
    return 'risk';
  }

  if (title && titleIndicatesPastMovement(title)) {
    // Reaction + tension pool for post-move titles (timeline alignment).
    return h % 3 === 0 ? 'tension' : 'reaction';
  }

  if (styleType === 'contrarian') {
    return h % 2 === 0 ? 'contrarian' : 'tension';
  }
  if (styleType === 'alert') {
    return h % 2 === 0 ? 'alert' : 'tension';
  }
  // insight
  return h % 2 === 0 ? 'curiosity' : 'tension';
}

export function selectHookFromLibrary(params: {
  item: NormalizedIntelligenceItem;
  styleType: TweetStyleType;
  intensity: HookIntensity;
  rewrittenTitle?: string;
}): string {
  const { item, styleType, intensity, rewrittenTitle } = params;
  const coin = item.coin;
  const direction = item.signal?.direction ?? 'unclear';
  const strength = strengthForTemplate(item);

  const kind = pickKind(item, styleType, intensity, rewrittenTitle);
  const templates = HOOK_LIBRARY[kind][intensity];
  const index = stableHash(`${item.id}|${styleType}|${intensity}|${kind}`) % templates.length;
  const template = templates[index];

  return fillTemplate(template, { coin, direction, strength });
}
