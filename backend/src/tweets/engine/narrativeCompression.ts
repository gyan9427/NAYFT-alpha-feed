import type { NormalizedIntelligenceItem } from '../types';

export type NarrativeContext = {
  hookLine: string;
  titleLine: string;
};

const NARRATIVE_MAX_CHARS = 175;

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function normalizeUnicodePunctuation(text: string): string {
  return text
    .replace(/\u2014/g, ' - ')
    .replace(/\u2013/g, '-')
    .replace(/\u2019/g, "'");
}

function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function ensureSentenceEnd(text: string): string {
  const t = normalizeWhitespace(text);
  if (!t) return t;
  if (/[.!?]$/.test(t)) return t;
  return `${t}.`;
}

/** First sentence or whole string if no boundary. */
function firstSentence(text: string): string {
  const t = normalizeWhitespace(text);
  if (!t) return t;
  const m = t.match(/^(.+?[.!?])(\s+|$)/);
  return m ? m[1].trim() : t;
}

function hasUncertaintyTone(context?: NarrativeContext): boolean {
  if (!context) return false;
  const blob = `${context.hookLine} ${context.titleLine}`.toLowerCase();
  return (
    blob.includes("doesn't look normal") ||
    blob.includes('might not be what') ||
    blob.includes('misleading') ||
    blob.includes('risky') ||
    blob.includes('wrong') ||
    blob.includes("isn't adding up")
  );
}

function rewriteImplicationClause(implication: string): string {
  const raw = normalizeWhitespace(normalizeUnicodePunctuation(implication));

  const downsidePrefix = /^Downside may be partly priced\s*;?\s*/i;
  if (downsidePrefix.test(raw)) {
    const rest = raw.replace(downsidePrefix, '');
    if (rest) return `A lot of this downside may already be priced in, ${rest}`;
  }

  const moveReflectedPrefix = /^Much of the move may already be reflected\s*;?\s*/i;
  if (moveReflectedPrefix.test(raw)) {
    const rest = raw.replace(moveReflectedPrefix, '');
    if (rest) return `A lot of this may already be priced in, ${rest}`;
  }

  return raw;
}

/** Strip interpretation to core clauses; em-dashes become pauses. */
function rewriteInterpretationClause(interpretation: string): string {
  const raw = normalizeWhitespace(normalizeUnicodePunctuation(interpretation));
  return raw.replace(/\s*-\s*/g, '. ').replace(/\s*;\s*/g, '; ');
}

function stripIncompleteFragments(text: string): string {
  let t = normalizeWhitespace(text);
  // Trailing lone "already", broken "treat ...", half clauses
  t = t.replace(/\s+treat\s*$/i, '');
  t = t.replace(/\s+already\s*$/i, '');
  t = t.replace(/\s+continuation\s*\.?\s*$/i, '');
  t = t.replace(/\s*;\s*$/, '');
  t = t.replace(/\s+,\s*$/, '');
  return normalizeWhitespace(t);
}

function countCommas(s: string): number {
  return (s.match(/,/g) ?? []).length;
}

/** If more than 2 commas, replace extras with em-dash clause or split into two sentences. */
function enforceCommaBudget(text: string): string {
  let t = stripIncompleteFragments(text);
  if (countCommas(t) <= 2) return t;

  const parts = t.split(',');
  if (parts.length <= 3) return t;

  // Join first three comma segments with commas, rest with " - "
  const head = parts.slice(0, 3).join(',');
  const tail = parts.slice(3).join(',').trim();
  return normalizeWhitespace(`${head} - ${tail}`);
}

/** Max 2 sentences; each ends with punctuation. */
function limitToTwoSentences(text: string): string {
  const t = stripIncompleteFragments(normalizeWhitespace(text));
  if (!t) return t;
  const chunks = t.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (chunks.length <= 2) {
    return chunks.map((c) => ensureSentenceEnd(c)).join(' ');
  }
  return `${ensureSentenceEnd(chunks[0])} ${ensureSentenceEnd(chunks[1])}`;
}

export function truncateAtSafeBoundary(text: string, maxChars: number): string {
  const t = normalizeWhitespace(text);
  if (t.length <= maxChars) return t;

  const window = t.slice(0, maxChars);
  const dot = window.lastIndexOf('. ');
  const but = window.toLowerCase().lastIndexOf(', but ');
  const em = window.lastIndexOf('—');
  const semi = window.lastIndexOf('; ');
  const sp = window.lastIndexOf(' ');

  let end = -1;
  if (dot >= 24) end = dot + 1;
  else if (but >= 24) end = Math.min(window.length, but + 48);
  else if (em >= 24) end = em + 1;
  else if (semi >= 24) end = semi + 1;
  else if (sp >= 32) end = sp;

  if (end <= 0 || end > maxChars) end = Math.min(maxChars - 3, window.length);
  let out = t.slice(0, end).trim();
  if (out.length < 12) out = `${t.slice(0, maxChars - 3).trim()}...`;
  else if (!/[.!?]$/.test(out)) out = `${out}...`;
  return out;
}

function mergePricedInAndPressure(
  implicationRaw: string,
  interpretationRaw: string,
  direction: string | undefined,
  context: NarrativeContext | undefined,
): string | null {
  const imp = implicationRaw.toLowerCase();
  const inter = interpretationRaw.toLowerCase();

  const pricedIn =
    imp.includes('downside may be partly priced') || imp.includes('partly priced');
  const pricedInUp = imp.includes('much of the move may already be reflected') || imp.includes('already be reflected');

  const hasPressure =
    inter.includes('pressure') || inter.includes('bearish') || inter.includes('bullish') || inter.includes('trend');
  const avoidLate = inter.includes('late entry') || inter.includes('avoid late') || inter.includes('already reacted');

  if (pricedIn && hasPressure && direction === 'bearish') {
    const hedge = hasUncertaintyTone(context) ? 'could' : 'can';
    return `A lot of this downside may already be priced in, but pressure is still strong—so chasing this move ${hedge} be risky here.`;
  }

  if (pricedInUp && hasPressure && direction === 'bullish') {
    const hedge = hasUncertaintyTone(context) ? 'could' : 'can';
    return `A lot of this move may already be priced in, but the setup is still hot—so chasing this move ${hedge} be risky here.`;
  }

  if (pricedIn && hasPressure && avoidLate) {
    const hedge = hasUncertaintyTone(context) ? 'could' : 'can';
    return `A lot of this downside may already be priced in, but pressure is still strong—so chasing this move ${hedge} be risky here.`;
  }

  return null;
}

function dedupeClauses(a: string, b: string): { first: string; second: string | null } {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  if (!a) return { first: b, second: null };
  if (!b) return { first: a, second: null };
  if (bl.includes(al) || al.includes(bl)) {
    return { first: a.length >= b.length ? a : b, second: null };
  }
  // Overlap on first 40 chars -> keep longer
  if (al.slice(0, 40) === bl.slice(0, 40)) {
    return { first: a.length >= b.length ? a : b, second: null };
  }
  return { first: a, second: b };
}

function mergeGeneric(imp: string, inter: string, _context: NarrativeContext | undefined): string {
  const { first, second } = dedupeClauses(imp, inter);
  if (!second) return ensureSentenceEnd(first);

  const s1 = stripIncompleteFragments(firstSentence(first));
  const s2 = stripIncompleteFragments(firstSentence(second));

  const d = dedupeClauses(s1, s2);
  if (!d.second) return ensureSentenceEnd(d.first);

  // One sentence with ", but"
  if (s2.toLowerCase().startsWith('but ')) {
    return ensureSentenceEnd(`${s1}, ${s2}`);
  }
  return ensureSentenceEnd(`${s1}, but ${s2.replace(/^(but|yet)\s+/i, '')}`);
}

export function compressNarrative(item: NormalizedIntelligenceItem, context?: NarrativeContext): string {
  const sig = item.signal;
  const direction = sig?.direction?.toLowerCase();

  const impRaw = sig?.implication ? normalizeUnicodePunctuation(sig.implication) : '';
  const interpRaw = sig?.interpretation ? normalizeUnicodePunctuation(sig.interpretation) : '';
  const reasonRaw = item.reason ? normalizeWhitespace(item.reason) : '';
  const reasoningRaw = sig?.reasoning ? normalizeWhitespace(String(sig.reasoning)) : '';

  let merged: string | null = null;

  if (impRaw && interpRaw) {
    merged = mergePricedInAndPressure(impRaw, interpRaw, direction, context);
  }

  if (!merged && impRaw && interpRaw) {
    const impClause = rewriteImplicationClause(impRaw);
    const interpClause = rewriteInterpretationClause(interpRaw);
    merged = mergeGeneric(impClause, interpClause, context);
  }

  if (!merged && impRaw && !interpRaw) {
    merged = ensureSentenceEnd(rewriteImplicationClause(impRaw));
  }

  if (!merged && !impRaw && interpRaw) {
    merged = ensureSentenceEnd(firstSentence(rewriteInterpretationClause(interpRaw)));
  }

  if (!merged && reasonRaw) {
    merged = ensureSentenceEnd(reasonRaw);
  }

  if (!merged && reasoningRaw) {
    merged = ensureSentenceEnd(firstSentence(reasoningRaw));
  }

  if (!merged) {
    merged = `${item.coin} is in focus on this setup.`;
  }

  let out = stripIncompleteFragments(merged);
  out = capitalizeFirst(out);
  out = enforceCommaBudget(out);
  out = limitToTwoSentences(out);
  out = truncateAtSafeBoundary(out, NARRATIVE_MAX_CHARS);

  return normalizeWhitespace(out.replace(/\n/g, ' '));
}
