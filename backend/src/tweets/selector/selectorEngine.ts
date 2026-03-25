import type { NormalizedIntelligenceItem } from '../types';

export type SelectorOptions = {
  limit: number;
  onlyHighlighted?: boolean;
};

function intelligentRankOrInfinity(item: NormalizedIntelligenceItem): number {
  return typeof item.intelligentRank === 'number' ? item.intelligentRank : Number.POSITIVE_INFINITY;
}

function confidenceOrZero(item: NormalizedIntelligenceItem): number {
  return typeof item.signal?.confidence === 'number' ? item.signal.confidence : 0;
}

function priorityOrZero(item: NormalizedIntelligenceItem): number {
  return typeof item.priorityTotal === 'number' ? item.priorityTotal : 0;
}

export function selectTopIntelligenceItems(items: NormalizedIntelligenceItem[], opts: SelectorOptions): NormalizedIntelligenceItem[] {
  const { limit, onlyHighlighted } = opts;

  const filtered = onlyHighlighted
    ? items.filter((it) => it.signal?.highlight === true)
    : items;

  return filtered
    .slice()
    .sort((a, b) => {
      // lower intelligent_rank is better
      const ar = intelligentRankOrInfinity(a);
      const br = intelligentRankOrInfinity(b);
      if (ar !== br) return ar - br;

      // higher confidence is better
      const ac = confidenceOrZero(a);
      const bc = confidenceOrZero(b);
      if (ac !== bc) return bc - ac;

      // higher priority_total is better
      const ap = priorityOrZero(a);
      const bp = priorityOrZero(b);
      if (ap !== bp) return bp - ap;

      // stable final tie-break: coin + title
      return `${a.coin}:${a.title}`.localeCompare(`${b.coin}:${b.title}`);
    })
    .slice(0, limit);
}

