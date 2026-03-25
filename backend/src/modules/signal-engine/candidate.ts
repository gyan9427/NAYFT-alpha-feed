import type { NayftSignalType } from '../../data-access/dtos';

/** Output of pure signal generators (before insight). */
export type CandidateSignal = {
  coin: string;
  type: NayftSignalType;
  strength: number;
  timestamp: Date;
  meta: Record<string, unknown>;
};
