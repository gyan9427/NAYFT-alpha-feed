import type { NormalizedIntelligenceItem } from '../types';

function stableHash(str: string): number {
  // FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function stripFillerPhrases(title: string): string {
  let t = title;
  const fillers: RegExp[] = [
    /\bhere'?s why\b/gi,
    /\bhere is why\b/gi,
    /\banalysis shows\b/gi,
    /\breport suggests\b/gi,
    /\breport says\b/gi,
    /\banalyst(s)? say\b/gi,
  ];

  for (const re of fillers) t = t.replace(re, '');

  // remove dangling separators
  t = t.replace(/\s*[–-]\s*$/g, '');
  t = t.replace(/\s*[:;]\s*$/g, '');

  return normalizeWhitespace(t);
}

function coinAwareReplace(title: string, coin: string): string {
  let t = title;
  if (coin === 'BTC') {
    t = t.replace(/\bBitcoin\b/gi, 'BTC');
  } else if (coin === 'ETH') {
    t = t.replace(/\bEthereum\b/gi, 'ETH');
    t = t.replace(/\bEther\b/gi, 'ETH');
  }
  return t;
}

function extractPercentAndWindow(title: string): { pct: string; window: string } | null {
  // X% in Y time
  // Examples:
  // - "4% drop in 12 hours"
  // - "moved 6.2% in 30m"
  // - "spike 10% in 2 days"
  const pctMatch = title.match(/(\d+(?:\.\d+)?)\s*%/i);
  if (!pctMatch) return null;

  const windowMatch = title.match(/\bin\s+(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m|days?|d)\b/i);
  if (!windowMatch) return null;

  const pct = `${pctMatch[1]}%`;
  const window = `${windowMatch[1]}${windowMatch[2].toLowerCase().startsWith('h') ? 'h' : windowMatch[2].toLowerCase().startsWith('m') ? 'm' : 'd'}`;
  return { pct, window };
}

function isWarningTitle(title: string): boolean {
  return /\b(risky|warning|danger|liquidation|liquidations|selloff|capitulation|ban|lawsuit|hack|exploit)\b/i.test(
    title,
  );
}

function toSingleSentence(text: string): string {
  const t = normalizeWhitespace(text);
  if (!t) return t;
  // Keep only first sentence-ish chunk.
  const m = t.match(/^(.+?[.!?])\s+/);
  if (m) return m[1].trim();
  return t;
}

function ensurePeriod(text: string): string {
  const t = normalizeWhitespace(text);
  if (!t) return t;
  if (/[.!?]$/.test(t)) return t;
  return `${t}.`;
}

export function rewriteTitle(item: NormalizedIntelligenceItem): string {
  const coin = item.coin;
  const rawTitle = normalizeWhitespace(item.title ?? '');

  if (!rawTitle) return `${coin} is in focus right now.`;

  // Normalize and simplify while preserving meaning.
  let title = coinAwareReplace(rawTitle, coin);
  title = stripFillerPhrases(title);

  // Pattern A: Drop/Spike with X% and time window
  const pctWindow = extractPercentAndWindow(title);
  if (pctWindow) {
    const variants = [
      '{coin} just moved {pct} in {window}... but this might not be what it looks like.',
      '{coin} just moved {pct} in {window}... and the market reaction feels off.',
      '{coin} just moved {pct} in {window}... but the headline doesn\'t tell the whole story.',
    ];
    const idx = stableHash(`${item.id}|title|pctWindow`) % variants.length;
    return variants[idx]
      .replaceAll('{coin}', coin)
      .replaceAll('{pct}', pctWindow.pct)
      .replaceAll('{window}', pctWindow.window);
  }

  // Pattern B: Warning
  if (isWarningTitle(title)) {
    const variants = [
      '{coin} might be heading into a risky zone.',
      'This {coin} setup is starting to look risky.',
      '{coin} is drifting into a riskier zone.',
    ];
    const idx = stableHash(`${item.id}|title|warning`) % variants.length;
    return variants[idx].replaceAll('{coin}', coin);
  }

  // Pattern C: General
  const generalVariants = [
    '{coin} is seeing something interesting right now.',
    '{coin} is back in focus right now.',
    'Something around {coin} is worth watching right now.',
  ];
  const idx = stableHash(`${item.id}|title|general`) % generalVariants.length;
  const general = generalVariants[idx].replaceAll('{coin}', coin);

  // Fallback: keep a simplified form of the original title if it is short enough.
  const simplified = toSingleSentence(title);
  const simplifiedClean = ensurePeriod(simplified.replace(/\s*[–-]\s*/g, ' - '));
  if (simplifiedClean.length > 0 && simplifiedClean.length <= 110) return simplifiedClean;

  return general;
}

