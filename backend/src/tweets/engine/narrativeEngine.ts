import type { NormalizedIntelligenceItem } from '../types';

export function narrativeEngine(item: NormalizedIntelligenceItem): string {
  const sig = item.signal;
  const lines: string[] = [];

  if (sig?.implication) lines.push(`Implication: ${sig.implication}`);
  if (sig?.interpretation) lines.push(`Interpretation: ${sig.interpretation}`);

  // Fallbacks: keep verbosity controlled.
  if (lines.length === 0 && item.reason) lines.push(`Reason: ${item.reason}`);
  if (lines.length === 0 && sig?.reasoning) {
    // `reasoning` can be longer; truncate in formatterEngine later.
    lines.push(String(sig.reasoning));
  }

  return lines.join('\n');
}

