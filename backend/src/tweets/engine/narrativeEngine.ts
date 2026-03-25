import type { NormalizedIntelligenceItem } from '../types';

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function ensureSentenceEnd(text: string): string {
  const t = normalizeWhitespace(text);
  if (!t) return t;
  if (/[.!?]$/.test(t)) return t;
  return `${t}.`;
}

function rewriteImplication(implication: string): string {
  const raw = normalizeWhitespace(implication);

  // Small curated rewrites for the dataset's most common implication phrasing.
  const downsidePrefix = /^Downside may be partly priced\s*;?\s*/i;
  if (downsidePrefix.test(raw)) {
    const rest = raw.replace(downsidePrefix, '');
    if (rest) return ensureSentenceEnd(`A lot of this downside may already be priced in, ${rest}`);
  }

  const moveReflectedPrefix = /^Much of the move may already be reflected\s*;?\s*/i;
  if (moveReflectedPrefix.test(raw)) {
    const rest = raw.replace(moveReflectedPrefix, '');
    if (rest) return ensureSentenceEnd(`A lot of this may already be priced in, ${rest}`);
  }

  return ensureSentenceEnd(raw);
}

function rewriteInterpretation(interpretation: string): string {
  const raw = normalizeWhitespace(interpretation);

  // Convert the common em-dash style into a more tweet-friendly sentence rhythm.
  // Keep meaning, only adjust punctuation + spacing.
  const withPunctuation = raw
    .replace(/\s*\u2014\s*/g, '. ')
    .replace(/\s*;\s*/g, '; ')
    .trim();

  return ensureSentenceEnd(withPunctuation);
}

export function narrativeEngine(item: NormalizedIntelligenceItem): string {
  const sig = item.signal;

  const implication = sig?.implication ? rewriteImplication(sig.implication) : '';
  const interpretation = sig?.interpretation ? rewriteInterpretation(sig.interpretation) : '';

  const sentences: string[] = [];
  if (implication) sentences.push(implication);

  if (interpretation) {
    // Simple de-dupe: if interpretation fully contains implication, skip it.
    const imp = implication ? implication.toLowerCase() : '';
    const inter = interpretation.toLowerCase();
    if (!imp || !inter.includes(imp)) sentences.push(interpretation);
  }

  // Fallbacks: keep verbosity controlled.
  if (sentences.length === 0 && item.reason) sentences.push(ensureSentenceEnd(item.reason));
  if (sentences.length === 0 && sig?.reasoning) {
    const reasoning = normalizeWhitespace(String(sig.reasoning));
    // `reasoning` can be long; keep it tweet-friendly.
    sentences.push(ensureSentenceEnd(reasoning.slice(0, 180)));
  }

  // Must be a single line for the formatter.
  return normalizeWhitespace(sentences.join(' '));
}

