import type { KlineCandleDto } from '../../data-access/dtos';

/** Largest index i with klines[i].openTime <= t (sorted ascending by openTime). */
export function closeAtOrBeforeIndex(klines: KlineCandleDto[], t: Date): number {
  let lo = 0;
  let hi = klines.length - 1;
  let ans = -1;
  const tt = t.getTime();
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (klines[mid].openTime.getTime() <= tt) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

export function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
