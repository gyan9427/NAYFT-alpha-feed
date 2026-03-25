import type { NormalizedIntelligenceItem } from '../types';

export function hookEngine(item: NormalizedIntelligenceItem): string {
  const sig = item.signal;

  const parts: string[] = [];
  if (sig?.direction) parts.push(sig.direction);
  if (sig?.strengthLabel) parts.push(sig.strengthLabel);
  if (sig?.timing) parts.push(sig.timing);

  const header =
    parts.length > 0 ? `${item.coin} Alert (${parts.join(', ')})` : `${item.coin} Alert`;

  // Keep the original title text as-is to avoid changing factual meaning.
  return [header, item.title].join('\n');
}

