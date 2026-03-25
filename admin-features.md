# Crypto Admin Dashboard — feature specification

This document describes the **crypto** application (**`crypto-backend`** + **`crypto-market`**) and defines a **crypto-admin-dashboard** feature list so operators can **watch** and **take control** of product behavior, infrastructure, and community activity.

> **Scope:** Analysis is based on `crypto-backend` (Express API, MongoDB, Redis, WebSockets, jobs) and `crypto-market` (Expo / React Native client). It replaces any prior NAYFT-only content.

---

## 1. Application map

### 1.1 Backend (`crypto-backend`)

| Area | Role |
|------|------|
| **HTTP API** | Base path `/api` (see routes below). `GET /health` for liveness. |
| **Auth** | JWT: signup, login, `GET /api/auth/me`. |
| **Market** | Trending, top gainers/losers, active coins (CMC / internal data). |
| **Coins** | Profiles, stats, related news per coin. |
| **News** | Explore + category filters, following feed (coins/users modes), detail; **`POST /api/news/store-news`** runs ingestion and emits analytics events. |
| **Search** | Unified search: coins, news, users, news boards, portfolio assets (cursor). |
| **Wishlist** | Legacy coin list (client falls back from follow). |
| **News boards** | Authenticated: list/create boards, save/unsave articles, board news. |
| **Comments** | Threaded comments and replies on news; delete own comment. |
| **Reactions** | Multiple reaction types on news; counts and user reaction. |
| **Follow** | Follow/unfollow users and coins; followers lists; stats. |
| **Rewards** | Points and claim actions (authenticated). |
| **Charts** | Klines, aggregate market trend (public chart endpoints used by the app). |
| **Portfolio** | Supported chains, wallets CRUD, holdings (Zerion), wallet events, refresh tx status; **webhooks** for Alchemy and Zerion (unsigned HTTP receivers with HMAC verification inside handlers). |
| **Metrics** | `GET /api/metrics` — MongoDB pool state, Redis INFO-derived stats, process memory/uptime (not admin-protected today). |
| **Feature system** | Mongo `feature_registry`: module features registered at boot from `modules/*/featureConfig.ts` + core `system` feature. Supports `isActive`, `controllable`, `critical`, rollout %, allowlists, metadata. |
| **Plans** | Mongo `plans` — seeded defaults (free / premium / enterprise) with `featureKeys` bundles. |
| **Analytics** | `POST /api/events` (rate-limited) accepts `featureKey`, `eventType`, `metadata`; optional `userId` from JWT. Redis queue → worker persists `SystemEvent` documents. Invalid `featureKey` still stored with `invalidFeature` flag. |
| **Admin API** | `x-admin-key` + optional `x-admin-id` — see §2. |
| **Realtime** | WebSocket `/ws`: Binance-driven price updates, subscriptions; wallet event broadcast to subscribed clients. |
| **Jobs / streams** | Binance kline adapters, kline downsampler cron, event worker. |

### 1.2 Frontend (`crypto-market`)

| Area | Role |
|------|------|
| **Shell** | Expo Router tabs: Home (news), Portfolio, Market, Profile; hidden routes for coin detail, news boards, search; FAB. |
| **Feature gating** | `useFeaturesStore` loads `GET /api/features` (active keys); tabs like Home / Portfolio / Market / Rewards hide when corresponding feature is off (`news_feed`, `portfolio_tracking`, `market_data`, `rewards`). |
| **Client analytics** | `trackEvent()` → `POST /api/events` (fire-and-forget). |
| **API client** | `src/services/api.ts` — news, coins, search, follow, boards, comments, reactions, charts, portfolio, auth, etc. |

---

## 2. Existing admin APIs (backend)

All require header **`x-admin-key`** matching **`ADMIN_API_KEY`**. If unset, admin routes return **501**. Optional **`x-admin-id`** is stored on feature updates for audit.

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/admin/features` | Query params: `module`, `isActive`, `category` — list features from registry. |
| `PATCH` | `/api/admin/features/:key` | Update safe fields: `name`, `description`, `isActive` (only if `controllable`). Optimistic concurrency on `updatedAt`. Writes **`feature_audit_logs`**. |
| `GET` | `/api/admin/plans` | List subscription plans (`plans` collection). |
| `GET` | `/api/admin/events/trends` | Query: `from`, `to`, `featureKey` — daily aggregates of event counts by feature/type. |
| `GET` | `/api/admin/events/feature/:featureKey` | Query: `from`, `to`, `limit` — aggregate counts **by `eventType`** for one feature. |

---

## 3. Feature registry keys (product toggles)

Registered module keys (from `featureConfig` files + core):

| Key | Module | Typical use |
|-----|--------|----------------|
| `auth` | auth | Login/signup (**critical**). |
| `system` | core | System-level events. |
| `news_feed` | news | News explore/following. |
| `news_boards` | newsboard | Boards and saves. |
| `follow` | follow | Follow users/coins. |
| `rewards` | rewards | Points and claims. |
| `portfolio_tracking` | portfolio | Wallets, holdings, events. |
| `market_data` | market | Trending, lists. |
| `metrics` | metrics | Ops metrics surface (if gated in UI). |
| `coin_profiles` | coin | Coin detail/stats/news. |
| `charts` | chart | Klines / charts. |
| `comments` | comment | News comments. |
| `reactions` | reaction | News reactions. |
| `unified_search` | search | Global search. |
| `user_profile` | user | Profile routes. |
| `wishlist` | wishlist | Legacy wishlist. |

**Note:** `reactions`, `unified_search`, and `user_profile` configs omit `controllable: true` in code — admin toggling behavior depends on how `registerFeature` defaults; dashboard should show **controllable** flag per row from API.

---

## 4. Crypto admin dashboard — feature list

Below: capabilities the **admin dashboard** should provide so staff can **monitor** and **control** the app and community. Items marked **(exists)** align with current APIs; **(extend)** needs new backend or UI work.

### 4.1 Authentication & access

- **Admin login** — Store/session or API key entry; all calls send `x-admin-key` **(exists: env key only; UI may wrap)**.
- **Role separation** — Read-only vs operator vs super-admin **(extend)**.
- **Audit identity** — Pass `x-admin-id` on mutations for `feature_audit_logs` **(exists)**.

### 4.2 Feature & plan control (kill switches)

- **Feature catalog** — Table with filters: module, category (`free` / `premium` / `enterprise`), active, controllable, critical, deprecated **(exists: GET /api/admin/features)**.
- **Toggle features** — Turn modules on/off (e.g. disable `comments`, `rewards`, `portfolio_tracking`) **(exists: PATCH)**.
- **Edit labels** — Name/description for operator clarity **(exists: PATCH)**.
- **Plans overview** — List plans and bundled `featureKeys` **(exists: GET /api/admin/plans)**.
- **Plan editor** — Add/change plans and feature bundles **(extend — today read-only in admin routes)**.
- **Rollout / allowlist** — Edit `rolloutPercentage`, `allowedUsers`, `segments` in UI **(extend — not exposed on PATCH schema today)**.

### 4.3 Analytics & community activity (watch)

- **Event trends** — Time-series chart: `GET /api/admin/events/trends` with date range and optional `featureKey` **(exists)**.
- **Per-feature breakdown** — Bar/table of `eventType` counts: `GET /api/admin/events/feature/:featureKey` **(exists)**.
- **Invalid feature tracking** — Dashboard for events stored with invalid `featureKey` (data quality / client bugs) **(extend — query `SystemEvent` with `invalidFeature: true`)**.
- **Funnel by screen** — Map common `eventType` / `metadata` conventions from mobile `trackEvent` **(process + docs)**.
- **DAU / WAU proxy** — Distinct `userId` in events **(extend)**.

### 4.4 News & content operations

- **Ingestion run control** — Trigger or schedule `POST /api/news/store-news` (secured for admin only) **(extend — currently unauthenticated on that route; admin should proxy with auth)**.
- **Ingestion metrics** — Show last run: fetched/stored/skipped from `news_feed` / `store_news_run` events **(watch via events + ingestion logs)**.
- **Article visibility** — List/hide/archive news items **(extend)**.
- **Boards oversight** — Count boards per user, list boards for a user **(extend)**.

### 4.5 Community moderation (control)

- **Comments** — Search by user/news; moderate (hide/delete any comment); rate-limit flags **(extend)**.
- **Reactions** — Audit abnormal spikes; optional reset **(extend)**.
- **User accounts** — Suspend user, force logout (invalidate tokens), reset password **(extend)**.
- **Follow graph** — Inspect follow relationships; detect spam patterns **(extend)**.
- **Rewards** — Audit claims by user/action; reverse or cap points **(extend)**.

### 4.6 Portfolio & web3 operations

- **Webhook health** — Alchemy/Zerion webhook delivery logs, signature failures **(extend)**.
- **Wallet abuse** — List wallets with high event volume; block address **(extend)**.
- **Supported chains config** — Display env-driven chains (`/api/portfolio/chains`) **(watch)**.

### 4.7 Market & charts infrastructure

- **Stream health** — Binance adapter / downsampler job last success **(extend — logs/metrics)**.
- **Symbol coverage** — Active coins vs chart requests **(partial — `active-coins` + internal stats)**.
- **WebSocket** — Connected clients, subscribed symbols (operational) **(extend)**.

### 4.8 Infrastructure & reliability

- **Health** — `GET /health` status **(exists)**.
- **Deep metrics** — Proxy or embed `GET /api/metrics` (Mongo, Redis hit rate, process) **(exists; consider protecting or proxying)**.
- **Redis queue** — Event queue depth / worker lag **(extend)**.
- **Cron jobs** — Kline downsampler schedule from config **(watch in logs)**.

### 4.9 Configuration (read-only console)

- **Environment summary** — Non-secret config: `FRONTEND_URL` pattern, chain list, feature-related env **(extend)**.
- **Secrets** — Never display keys; link to rotation runbook **(docs)**.

### 4.10 Mobile app alignment

- **Effective UX when features off** — Document tab hiding (`news_feed`, `portfolio_tracking`, `market_data`, `rewards`) so support matches product **(see `crypto-market/app/(tabs)/_layout.tsx`)**.
- **Public feature list** — `GET /api/features` (active keys only) for comparison with admin registry **(exists)**.

---

## 5. Suggested implementation phases

1. **Phase A — Operator console (minimal)** — Admin auth UI + feature list/toggle + plans read-only + event trends + link to `/health` and metrics.
2. **Phase B — Trust & safety** — Comment/user moderation APIs + ingestion trigger secured behind admin.
3. **Phase C — Growth & billing** — Plan editing, subscriptions collection management, richer analytics.

---

## 6. Code reference (for engineers)

| Concern | Location |
|--------|----------|
| Admin routes | `crypto-backend/src/core/admin/routes.ts` |
| Feature CRUD / audit | `crypto-backend/src/core/feature-system/feature.service.ts`, `feature.controller.ts`, `featureAudit.model.ts` |
| Events / trends | `crypto-backend/src/core/event-system/event.service.ts`, `event.controller.ts`, `public.controller.ts` |
| Plans | `crypto-backend/src/core/plan.controller.ts`, `plans.model.ts`, `bootstrapPlans.ts` |
| App wiring | `crypto-backend/src/app.ts`, `crypto-backend/src/server.ts` |
| Admin auth middleware | `crypto-backend/src/middlewares/adminAuth.ts` |
| Mobile API + tracking | `crypto-market/src/services/api.ts`, `crypto-market/src/utils/trackEvent.ts`, `crypto-market/src/utils/features.ts` |

---

*This file is the single spec for **crypto-admin-dashboard** capabilities relative to the current **crypto-backend** and **crypto-market** codebase.*
