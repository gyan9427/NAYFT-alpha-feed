# About Alpha Feed

`NAYFT-alpha-feed` is a small “alpha feed” service that serves two deterministic outputs:

1. **Signals feed**: rule-based crypto signals generated from market candles + news (MongoDB), persisted as `nayft_signals`, and exposed via JSON endpoints.
2. **AI Generated Tweets**: narrative tweet text generated from the already-processed News Intelligence Lab export (`backend/data/newsintelligence.json`), exposed via JSON endpoints and rendered in a minimal React/Vite UI.

## What’s implemented (current scope)

1. **Mongo-driven signals generation** (no external APIs), with:
   - `price_spike` (5m/15m close-to-close momentum)
   - `volume_spike` (volume ratio vs moving average)
   - `news_impact` (price move after a news publication time)
2. Cron-based signal pipeline runs automatically and refreshes the stored feed (`nayft_signals`).
3. Signals read-only JSON API consumed by the frontend.
4. **Local JSON-driven tweet generation** using `backend/data/newsintelligence.json` as the only truth input.
5. Tweet endpoints (`/nayft/tweets`, `/nayft/tweets/top`) return generated tweet text.
6. Frontend UI renders both: the signals feed and an “AI Generated Tweets” section with a copy button.

## Service layout

- Backend: `NAYFT-alpha-feed/backend`
  - Express app with a `/health` endpoint and a `/nayft` mount for signal routes.
  - A scheduled pipeline (`runSignalPipeline`) that writes to Mongo.
  - Signal logic split into:
    - `modules/signal-engine/*` (signal candidate computations)
    - `modules/content-engine/content.service.ts` (text “insight” rendering)
  - Tweet/narrative layer (new):
    - loads `data/newsintelligence.json`
    - normalizes `items[]`
    - selects top items and deterministically generates `tweetText`
    - exposes endpoints under `/nayft/tweets/*`
  - Data access via:
    - `data-access/*` repositories (Mongoose models/queries)
- Frontend: `NAYFT-alpha-feed/frontend`
  - React/Vite page that renders:
    - signals feed (from `/nayft/signals*`)
    - AI Generated Tweets feed (from `/nayft/tweets`)

## Backend API

Base:
- `GET /health` -> `{"status":"ok","service":"nayft-alpha-feed"}`

Mounted under `/nayft`:
- `GET /nayft/signals?limit=N`
  - Returns latest stored signals ordered by `timestamp` descending.
- `GET /nayft/signals/high-confidence?limit=N`
  - Returns stored signals with `strength > 0.7`.
- `GET /nayft/signals/:coin?limit=N`
  - Returns stored signals for a single coin (case-insensitive input).
- `GET /nayft/tweets?limit=N`
  - Returns generated tweets for the top ranked items, using a highlight filter (`signal.highlight === true`) inside the tweet selector.
- `GET /nayft/tweets/top?limit=N`
  - Returns generated tweets for the top ranked items without the highlight filter.

All routes return JSON shaped like:
- `{"success": true, "data": [...]}` or `{"success": false, "error": "..."}`.

## MongoDB data model (collections used)

The pipeline and API currently rely on these collections:

1. `nayft_signals`
   - Documents represent persisted feed items.
   - Stored fields:
     - `coin` (string)
     - `type` (`price_spike` | `volume_spike` | `news_impact`)
     - `strength` (number, intended range 0..1)
     - `timestamp` (Date)
     - `meta` (mixed JSON; type-specific metadata)
     - `insight` (generated multi-line text)
2. `ohlcv_klines`
   - Used as the market candle source.
   - The signal engine expects:
     - `meta.interval = "1m"`
     - `meta.exchange` and `meta.symbol`
     - `openTime`, `open`, `high`, `low`, `close`, `volume`
3. `newsarticles`
   - Used as the news source for `news_impact`.
   - The repository reads:
     - `publishedAt` (Date)
     - `title`
     - `coins` array with `{ symbol }` entries (mapped to `coinSymbols`)
4. `filtered_coins`
   - Used to form the processing universe.
   - The pipeline reads `distinct base_asset` and intersects it with configured tracked symbols.

## Tweet layer data model (non-persistent)

The tweet layer does not persist to MongoDB.

Instead, it loads and normalizes:
- `backend/data/newsintelligence.json`
  - uses top-level `items[]`
  - expects per-item fields like:
    - `news_id`, `primary_coin`, `title`, `published_at_utc`
    - `score`, `intelligent_rank`, `priority_total`, `reason`
    - `signal.*` including `signal_type`, `direction`, `confidence`, `strength_label`, `timing`, `watch_intensity`, `implication`, `interpretation`, `reasoning`, `horizon_used`, and `highlight`

## Pipeline behavior (how signals are computed)

The pipeline entrypoint is `backend/src/pipeline/runSignalPipeline.ts`.

It runs:
- Automatically on a cron schedule (`node-cron`, UTC timezone).
- Once immediately at service startup.

High-level flow per run:

1. Build a `universe` of tracked coins.
   - Prefer `filtered_coins` distinct assets filtered to `NAYFT_TRACKED_SYMBOLS`.
   - Fallback: use `NAYFT_TRACKED_SYMBOLS` directly if DB data is empty/failed.
2. Generate candidate signals from klines.
   - For each coin (processed in batches):
     - Pull 1m klines for the last `NAYFT_KLINE_HISTORY_MINUTES`.
     - Compute:
       - `computePriceSpike` (compares close vs 5m/15m historical anchors)
       - `computeVolumeSpike` (compares latest volume vs moving average)
     - Each computation can emit zero or one `CandidateSignal`.
3. Generate `news_impact` candidates from recent news.
   - Fetch news since `NAYFT_NEWS_LOOKBACK_HOURS`.
   - For each article and each tracked coin symbol inside it:
     - Fetch baseline 1m `close` at or before `publishedAt`.
     - Fetch 1m candles from `publishedAt` to “now” and use the last candle close.
     - Compute percent change; if `abs(pctChangePct)` exceeds `NAYFT_NEWS_MOVE_PCT`, emit a signal.
4. Deduplicate before persisting.
   - Dedup within the run by `(coin, type)`.
   - Dedup across runs using `existsRecent(...)` with a `NAYFT_DEDUP_WINDOW_MINUTES` lookback window.
5. Persist and enrich.
   - Persist new signals with `signalsRepo.insertMany(...)` into `nayft_signals`.
   - Generate the user-facing `insight` text via `generateInsight(...)`.

## Content intelligence layer (how tweets are generated)

Tweet generation is implemented in the new tweet layer under `backend/src/tweets/*`.

Per request:
1. A cached normalized view of `data/newsintelligence.json` is loaded (and auto-reloaded if the file `mtime` changes).
2. A selector ranks items by:
   - `intelligent_rank` ascending (best first)
   - tie-break by `signal.confidence` descending
   - then `priority_total` descending
3. For each selected item, three deterministic pure engines build `tweetText`:
   - **Hook engine**: `${coin} Alert (${direction, strengthLabel, timing})` + the item `title`
   - **Narrative engine**: includes `Implication:` and `Interpretation:` when present (fallback to `reason` / `signal.reasoning`)
   - **Formatter engine**: joins the text with newlines, adds static hashtags, and truncates to a basic char limit.

Tweet response includes:
- `id`, `coin`, `rank`, optional `score`
- `tweetText` (generated string)
- `meta` (direction, signalType, strengthLabel, timing, watchIntensity)

## Signal types and what metadata they store

1. `price_spike`
   - Generated by comparing the last candle close against close values at/<= 5m and 15m in the past.
   - Metadata (`meta`) includes:
     - `timeframe` (`5m` or `15m`)
     - `pctChange` (rounded number)
     - `thresholdPct`
2. `volume_spike`
   - Compares latest candle volume to the moving average of the previous `NAYFT_VOLUME_MA_PERIODS` candles.
   - Emits only when `ratio >= NAYFT_VOLUME_SPIKE_RATIO`.
   - Metadata includes:
     - `ratio`
     - `movingAverageVolume`
     - `currentVolume`
     - `periods`
3. `news_impact`
   - Uses news publication time as the baseline anchor.
   - Metadata includes:
     - `newsId` (Mongo `_id` as string)
     - `title`
     - `publishedAt` (ISO string)
     - `priceChangePct` (rounded number)

## Frontend behavior (current UI)

The UI lives in `NAYFT-alpha-feed/frontend/src/App.tsx` and renders two sections:

Signals feed:
- Header: “NAYFT Alpha Feed”.
- Coin text filter:
  - empty filter => fetch latest signals (`fetchSignals(50)`)
  - non-empty => fetch coin-specific signals (`fetchSignalsByCoin(coin)`)
- Signal cards show:
  - coin + signal type
  - strength as a percentage
  - `insight` text
  - timestamp (formatted as local time)
- “Export insight” copies a tweet-like text to clipboard.

AI Generated Tweets:
- Loads `GET /nayft/tweets?limit=10` on mount.
- Shows tweet cards with:
  - coin
  - `tweetText`
  - rank (and/or score as a percentage)
- “Copy tweet” button uses the same clipboard-with-fallback logic.

## Configuration (env)

Backend env knobs (from `backend/.env.example`):
- `MONGO_URI`
- `NAYFT_PORT`
- `NAYFT_CORS_ORIGINS`
- `NAYFT_EXCHANGE`
- `NAYFT_TRACKED_SYMBOLS` (comma-separated; used as a universe filter)
- `NAYFT_SIGNAL_CRON` (cron expression; default runs every 5 minutes)
- `NAYFT_PRICE_SPIKE_PCT` (threshold for 5m/15m move)
- `NAYFT_VOLUME_MA_PERIODS` (moving average window size)
- `NAYFT_VOLUME_SPIKE_RATIO` (ratio threshold vs MA)
- `NAYFT_NEWS_LOOKBACK_HOURS` (how far back to fetch news)
- `NAYFT_NEWS_MOVE_PCT` (minimum absolute move to emit `news_impact`)
- `NAYFT_DEDUP_WINDOW_MINUTES` (dedup across runs)
- `NAYFT_PIPELINE_BATCH_SIZE` (how many coins processed concurrently)
- `NAYFT_KLINE_HISTORY_MINUTES` (how far back to pull 1m klines per coin)
- `LOG_LEVEL`

Tweet layer note:
- No new env knobs were added for tweets.
- The tweet layer reads `data/newsintelligence.json` relative to the backend process working directory.

Frontend env knob (from `frontend/.env.example`):
- `VITE_API_BASE_URL` (defaulting to `http://localhost:4002` in the code)

## Notes on “what’s designed so far”

This documentation reflects the code currently present in `NAYFT-alpha-feed/`:
- The service is focused on *serving*:
  - a computed signal feed (Mongo + cron), and
  - a narrative content layer (deterministic tweets) derived from the exported News Intelligence Lab JSON.
- It does not implement admin controls, websocket streaming, user tracking, or ingestion; those would be additional layers on top of the existing Mongo + cron design.

