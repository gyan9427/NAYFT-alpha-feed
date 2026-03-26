import type { NewsIntelligenceRaw } from '../tweets/intelligence/loadNewsIntelligence';

function asNewsIntelligenceRaw(parsed: unknown): NewsIntelligenceRaw {
  if (Array.isArray(parsed)) {
    return { items: parsed };
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const o = parsed as Record<string, unknown>;
    if (Array.isArray(o.items)) {
      return parsed as NewsIntelligenceRaw;
    }
  }
  throw new Error('analyse API: response must be JSON with `items[]` or a top-level array');
}

/**
 * POSTs to `process.env.ANALYSE_API_URL` and parses the JSON body (same shape as `newsintelligence.json`).
 */
export async function fetchAnalyseData(): Promise<NewsIntelligenceRaw> {
  const url = process.env.ANALYSE_API_URL?.trim();
  if (!url) {
    throw new Error('ANALYSE_API_URL is not set');
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`analyse API request failed: ${msg}`);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `analyse API HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`
    );
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    throw new Error('analyse API: response is not valid JSON');
  }

  const raw = asNewsIntelligenceRaw(parsed);
  if (!raw.items.length) {
    // Empty items is valid structure; normalize will produce []
  }
  return raw;
}
