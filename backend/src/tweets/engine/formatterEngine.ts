export function truncateAsciiPreserveNewlines(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  if (maxChars <= 3) return '...'.slice(0, maxChars);
  return `${text.slice(0, maxChars - 3)}...`;
}

function stableHash(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const STOP = new Set([
  'the',
  'this',
  'that',
  'with',
  'from',
  'just',
  'move',
  'like',
  'what',
  'when',
  'here',
  'there',
  'than',
  'into',
  'about',
]);

function significantTokens(s: string, coin: string): Set<string> {
  const lower = s.toLowerCase();
  const withCoin = lower.replace(new RegExp(`\\b${coin}\\b`, 'gi'), ' ');
  const words = withCoin.split(/\W+/).filter((w) => w.length > 3 && !STOP.has(w));
  return new Set(words);
}

/** If hook and title repeat the same core idea, swap title for a complementary line. */
function dedupeHookTitle(hook: string, title: string, coin: string): string {
  if (!hook || !title) return title;
  const a = significantTokens(hook, coin);
  const b = significantTokens(title, coin);
  let overlap = 0;
  for (const w of b) {
    if (a.has(w)) overlap++;
  }
  if (overlap < 2) return title;

  const alts = [
    `${coin}: follow-through matters more than the first print.`,
    `${coin}: watch the tape confirm the story, not the headline.`,
    `The real question for ${coin} is what happens next, not what already printed.`,
  ];
  return alts[stableHash(`${hook}|${title}|${coin}`) % alts.length];
}

export function formatterEngine(params: {
  hook: string;
  title?: string;
  narrative?: string;
  hashtags?: string[];
  maxChars?: number;
  coin?: string;
}): string {
  const { hook, title, narrative, hashtags = ['#crypto', '#trading'], maxChars = 280, coin = '' } = params;

  const maxLines = 4;

  // Target tweet layout (4 lines max):
  // 1) Hook
  // 2) Rewritten Title
  // 3) Narrative (single line)
  // 4) Hashtags
  const hookLine = hook.trim();
  const titleRaw = (title ?? '').replace(/\s+/g, ' ').trim();
  const titleLine = coin ? dedupeHookTitle(hookLine, titleRaw, coin) : titleRaw;

  const narrativeSingleLine = narrative
    ? narrative.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim()
    : '';

  const hashtagsLine = hashtags.length ? hashtags.join(' ') : '';

  /** Final tweet shape; empty segments are skipped (same as before). */
  function joinTweet(narr: string): string {
    return [hookLine, titleLine, narr, hashtagsLine].filter((p) => p !== '').join('\n');
  }

  if (hashtagsLine) {
    // Fit within maxChars by shortening ONLY the narrative. Never apply a global truncate
    // after join (that was cutting the hashtag line to "#crypto #tra...").
    if (joinTweet(narrativeSingleLine).length <= maxChars) {
      return joinTweet(narrativeSingleLine).split('\n').slice(0, maxLines).join('\n');
    }

    // Max prefix length of narrative such that full tweet <= maxChars
    let best = 0;
    let lo = 0;
    let hi = narrativeSingleLine.length;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (joinTweet(narrativeSingleLine.slice(0, mid)).length <= maxChars) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    let narrativeToUse = narrativeSingleLine.slice(0, best);

    // Prefer ending on a word boundary when we had to trim (still <= maxChars).
    if (best < narrativeSingleLine.length && best > 12) {
      const cut = narrativeToUse.lastIndexOf(' ');
      if (cut > best * 0.55) {
        const softer = narrativeSingleLine.slice(0, cut);
        if (joinTweet(softer).length <= maxChars) narrativeToUse = softer;
      }
    }

    return joinTweet(narrativeToUse).split('\n').slice(0, maxLines).join('\n');
  }

  const out = [hookLine, titleLine, narrativeSingleLine].filter(Boolean).slice(0, maxLines).join('\n');
  return truncateAsciiPreserveNewlines(out, maxChars);
}
