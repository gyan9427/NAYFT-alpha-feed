export function truncateAsciiPreserveNewlines(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  if (maxChars <= 3) return '...'.slice(0, maxChars);
  return `${text.slice(0, maxChars - 3)}...`;
}

export function formatterEngine(params: {
  hook: string;
  title?: string;
  narrative?: string;
  hashtags?: string[];
  maxChars?: number;
}): string {
  const { hook, title, narrative, hashtags = ['#crypto', '#trading'], maxChars = 280 } = params;

  const maxLines = 4;

  // Target tweet layout (4 lines max):
  // 1) Hook
  // 2) Rewritten Title
  // 3) Narrative (single line)
  // 4) Hashtags
  const hookLine = hook.trim();
  const titleLine = (title ?? '').replace(/\s+/g, ' ').trim();

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
