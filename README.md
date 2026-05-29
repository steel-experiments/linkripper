# LINKRIPPER 🪦

A personal, self-hosted web archive built on [Steel](https://steel.dev). Drop a
link and LINKRIPPER captures the page's **HTML**, **Markdown**, a **full-page
screenshot**, and **metadata** — then crops the screenshot into a thumbnail so
you can browse your archive as a grid of cards or a compact list of links.

Everything is yours: a single SQLite file and a folder of page artifacts on
disk. No cloud account required for storage.

## Features

- **Drop a link → archived.** A Steel `scrape` + `screenshot` captures rendered
  HTML, Markdown, metadata, and a full-page PNG.
- **Beats Cloudflare.** When a Turnstile / "checking your browser" interstitial
  is detected, LINKRIPPER auto-escalates to a Steel `solveCaptcha` session
  (driven over CDP) and waits for the challenge to clear before capturing.
- **Snapshot history.** Each capture is a timestamped snapshot. The grid shows
  the latest; the detail view shows the full timeline (like a mini Wayback).
- **Scheduled re-captures.** Per page: Off / hourly / every 6h / daily / weekly.
  An in-process scheduler fires due captures automatically.
- **Thumbnails.** Screenshots are top-cropped to WebP cards with an instant
  [thumbhash](https://evanw.github.io/thumbhash/) placeholder (no extra request).
- **Two views, two densities.** Thumbnail **grid** or link **list**, each in
  **compact** or **expanded** density — toggled via the URL.
- **Drag to rearrange.** Grab the ⠿ handle on any card/row to reorder; the
  manual order is persisted and survives reloads.
- **Detail view.** Snapshot timeline, full-page screenshot, extracted Markdown,
  raw HTML, and a link back to the original.
- **Safe delete.** Removing a page asks for confirmation, then deletes the row
  (snapshots cascade) and all its blobs.
- **Zero-ops storage.** SQLite (WAL) for metadata + filesystem for blobs.
- **In-process queue + scheduler.** Captures run one at a time in the
  background. No Redis, no external cron.

## Tech stack

| Layer        | Choice                                            |
| ------------ | ------------------------------------------------- |
| App          | Next.js 15 (App Router) + React 19 + Tailwind     |
| Capture      | Steel Node SDK (`steel-sdk`)                      |
| Database     | SQLite via Drizzle ORM (`better-sqlite3`)         |
| Blobs        | Local filesystem (`DATA_DIR/archive/<id>/`)       |
| Thumbnails   | `sharp` (crop/encode) + `thumbhash` (placeholder) |
| Jobs         | In-process serial queue                           |

## Getting started (local dev)

```bash
npm install
cp .env.example .env   # then fill in Steel config (see below)
npm run dev            # http://localhost:3000
```

### Configuring Steel

LINKRIPPER needs a Steel browser to capture pages. Two options:

- **Steel Cloud** — set `STEEL_API_KEY` (get one at https://app.steel.dev).
- **Self-hosted** — run [`steel-browser`](https://github.com/steel-dev/steel-browser)
  and set `STEEL_BASE_URL=http://localhost:3000` (no API key needed).

## Self-hosting with Docker

The included `docker-compose.yml` runs the app **and** a self-hosted
`steel-browser` together — fully on your own machine:

```bash
docker compose up --build
# app:   http://localhost:3000
# steel: http://localhost:3001
```

Your archive lives in `./data` (SQLite DB + page blobs), so back it up by
copying that one folder.

## Scripts

- `npm run dev` — dev server
- `npm run build` / `npm start` — production build & serve
- `npm test` — run the test suite (vitest)
- `npm run typecheck` — `tsc --noEmit`

## How a capture works

1. You submit a URL → a `pages` row + first `pending` snapshot are created and a
   job is enqueued.
2. The serial worker calls Steel: `scrape` (HTML + Markdown + metadata) and
   `screenshot` (full-page PNG).
3. **If a Cloudflare/Turnstile challenge is detected** in the result, it
   escalates: a `solveCaptcha` session is created, Puppeteer connects over CDP,
   and it polls Steel's captcha-status endpoint until the challenge clears, then
   captures the real page (HTML → Markdown via Readability + Turndown).
4. Artifacts are written to `DATA_DIR/archive/<snapshotId>/`.
5. `sharp` crops the screenshot into a WebP thumbnail + a thumbhash placeholder.
6. The snapshot flips to `done`, its display fields are denormalized onto the
   page, and the UI auto-refreshes.

Failed captures are marked `failed` with the error and can be retried. Pages
with a schedule are re-captured automatically as new snapshots.

> **Note:** Cloudflare/Turnstile solving is a **Steel Cloud** feature (paid
> plan). The self-hosted open-source `steel-browser` can archive normal pages
> but won't solve CAPTCHAs.
