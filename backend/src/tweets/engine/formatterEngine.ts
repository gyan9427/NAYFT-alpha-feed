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

  const parts: string[] = [];
  if (hook.trim()) parts.push(hook.trim());
  if (narrative?.trim()) parts.push(narrative.trim());
  if (hashtags.length) parts.push(hashtags.join(' '));

  const joined = parts.join('\n');
  return truncateAsciiPreserveNewlines(joined, maxChars);
}

