export function truncateAsciiPreserveNewlines(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  if (maxChars <= 3) return '...'.slice(0, maxChars);
  return `${text.slice(0, maxChars - 3)}...`;
}

export function formatterEngine(params: {
  hook: string;
  narrative?: string;
  hashtags?: string[];
  maxChars?: number;
}): string {
  const { hook, narrative, hashtags = ['#crypto', '#trading'], maxChars = 280 } = params;

  const maxLines = 4;

  // Target tweet layout:
  // 1) hook opening
  // 2) item title
  // 3) narrative (single line)
  // 4) hashtags
  const hookLines =
    hook.trim() === ''
      ? []
      : hook
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(0, 2);

  const narrativeSingleLine = narrative
    ? narrative.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim()
    : '';

  const hashtagsLine = hashtags.length ? hashtags.join(' ') : '';

  const baseLines = [...hookLines];
  if (hashtagsLine) baseLines.push(hashtagsLine);

  const totalLines = baseLines.length + (narrativeSingleLine ? 1 : 0);
  void totalLines; // line count is enforced by construction below.

  // Ensure hashtags don't get truncated off by truncating only the narrative portion first.
  // If we can't fit even an empty narrative + hashtags within maxChars, we fall back to global truncation.
  const build = (narr: string) => [...hookLines, narr, hashtagsLine].join('\n');

  if (hashtagsLine) {
    const fixedLen = build('').length;
    const allowedNarrativeLen = maxChars - fixedLen;
    const narrativeToUse =
      allowedNarrativeLen > 0
        ? narrativeSingleLine.length <= allowedNarrativeLen
          ? narrativeSingleLine
          : truncateAsciiPreserveNewlines(narrativeSingleLine, allowedNarrativeLen)
        : '';

    const out = build(narrativeToUse);
    const outLines = out.split('\n').slice(0, maxLines).join('\n');
    return truncateAsciiPreserveNewlines(outLines, maxChars);
  }

  // No hashtags (shouldn't happen with defaults), so do a simple truncation.
  const out = [...hookLines, narrativeSingleLine].filter(Boolean).slice(0, maxLines).join('\n');
  return truncateAsciiPreserveNewlines(out, maxChars);
}

