import fs from 'fs';
import path from 'path';

export type NewsIntelligenceRaw = {
  items: unknown[];
  // other top-level keys exist (e.g. by_coin, early_signals) but are not required here
  [k: string]: unknown;
};

export function getNewsIntelligenceJsonPath(): string {
  // Backend runs with cwd at `NAYFT-alpha-feed/backend` in typical `npm start` usage.
  return path.resolve(process.cwd(), 'data/newsintelligence.json');
}

export async function loadNewsIntelligenceJson(jsonPath: string = getNewsIntelligenceJsonPath()): Promise<NewsIntelligenceRaw> {
  const rawText = await fs.promises.readFile(jsonPath, 'utf-8');
  const parsed = JSON.parse(rawText) as NewsIntelligenceRaw;
  if (!parsed || !Array.isArray(parsed.items)) {
    throw new Error('newsintelligence.json: missing/invalid `items[]`');
  }
  return parsed;
}

