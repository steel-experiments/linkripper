# LINKRIPPER 🪦

> Drop a link, keep the whole page — a personal, self-hosted web archive built on [Steel](https://steel.dev).

Paste a URL and LINKRIPPER saves the rendered **HTML**, clean **Markdown**, a **full-page screenshot**, and **metadata** to your own machine. Because it captures through a real cloud browser, it gets pages that naive scrapers can't — Cloudflare-protected sites, JavaScript apps, and lazy-loaded images all come through intact.

Everything lives in one SQLite file and a folder of artifacts. No accounts, no third-party storage.

---

## Quick start

```bash
git clone https://github.com/steel-experiments/linkripper.git
cd linkripper
npm install
cp .env.example .env        # add your Steel API key (see Configuration)
npm run dev                 # → http://localhost:3000
```

Paste a link, hit **Rip it**, and watch it land in the grid.

## Features

- **One-box capture** — a URL in, HTML + Markdown + full-page screenshot + metadata out.
- **Beats the hard pages** — auto-solves Cloudflare/Turnstile, scrolls to load lazy images, and forces page visibility so nothing renders as a gray placeholder.
- **Snapshot history** — every capture is kept and timestamped, like a personal Wayback Machine. Promote any snapshot to be the one shown, or delete individual captures.
- **Scheduled re-captures** — off / hourly / every 6h / daily / weekly, per page.
- **Two views, two densities** — thumbnail grid or link list, compact or expanded.
- **Drag to rearrange** — grab the handle and reorder; the order sticks.
- **Basic vs ⚡ Steel Advanced toggle** — flip a switch in the nav to compare a naive capture against Steel's full powers (great for demos).
- **Zero-ops storage** — SQLite + the local filesystem. No Redis, no Postgres, no object store.

## How it works

1. You submit a URL → a page row and a first snapshot are created, and a capture job is queued.
2. A single in-process worker captures the page through Steel.
3. Artifacts are written to `data/archive/<snapshotId>/`, and `sharp` crops the screenshot into a WebP thumbnail with a tiny [thumbhash](https://evanw.github.io/thumbhash/) placeholder.
4. The snapshot flips to **done** and the grid updates.

<details>
<summary><b>The capture pipeline (Basic vs Advanced)</b></summary>

The nav switch sets a global capture mode:

| | **Basic** | **⚡ Steel Advanced** (default) |
|---|---|---|
| Method | Steel one-shot `scrape` + `screenshot` | Full Steel session over CDP |
| Cloudflare / Turnstile | ❌ stops at the challenge | ✅ `solveCaptcha` waits it out |
| Lazy images | ❌ gray below the fold | ✅ auto-scrolls + waits for decode |
| Hidden-tab lazy loads | ❌ | ✅ `bringToFront` forces visibility |

Advanced mode takes the fast one-shot first and only escalates to a session when a challenge is detected (or always, if `STEEL_SCROLL_CAPTURE=true`). In the escalated path, Puppeteer connects to the Steel session, waits for the captcha to clear, scrolls the full page, and waits for images before capturing; Markdown is derived locally with Readability + Turndown.

Each snapshot records which mode produced it, so the history timeline badges captures `Basic` vs `⚡Steel`.

</details>

<details>
<summary><b>Configuration</b></summary>

Copy `.env.example` to `.env`. The only thing you must set is how to reach Steel:

```bash
# Option A — Steel Cloud (get a key at https://app.steel.dev)
STEEL_API_KEY=sk-...

# Option B — self-hosted steel-browser (no key needed)
# STEEL_BASE_URL=http://localhost:3000
```

Optional tuning:

| Variable | Default | Purpose |
|---|---|---|
| `STEEL_CAPTURE_DELAY` | `3000` | ms to wait after navigation before capturing |
| `STEEL_SCROLL_CAPTURE` | `false` | route every page through the auto-scrolling session |
| `STEEL_USE_PROXY` | `false` | use a Steel residential proxy on the session path |
| `DATA_DIR` | `./data` | where the SQLite DB and blobs live |

> **Cloudflare/Turnstile solving is a Steel Cloud feature** (paid plan). A self-hosted `steel-browser` archives normal pages fine but won't solve CAPTCHAs.

</details>

<details>
<summary><b>Self-hosting with Docker</b></summary>

The included `docker-compose.yml` runs the app **and** a self-hosted `steel-browser` together — fully on your own machine:

```bash
docker compose up --build
# app:   http://localhost:3000
# steel: http://localhost:3001
```

Your archive lives in `./data` (one SQLite file + the blob folders). Back it up by copying that folder.

</details>

<details>
<summary><b>Tech stack</b></summary>

| Layer | Choice |
|---|---|
| App | Next.js 15 (App Router) · React 19 · Tailwind |
| Capture | Steel Node SDK · `puppeteer-core` (escalated path) |
| Markdown | `@mozilla/readability` + `turndown` |
| Database | SQLite via Drizzle ORM (`better-sqlite3`, WAL) |
| Blobs | local filesystem |
| Images | `sharp` (crop/encode) + `thumbhash` (placeholder) |
| Jobs | in-process serial queue + interval scheduler |
| Drag & drop | `@dnd-kit` |

</details>

<details>
<summary><b>Development</b></summary>

```bash
npm run dev          # dev server
npm run build        # production build
npm start            # serve the build
npm test             # vitest (unit + integration)
npm run typecheck    # tsc --noEmit
npm run test:e2e -- https://example.com   # real capture against live Steel
```

Note: don't run `npm run build`/`npm start` in the same directory as a running `npm run dev` — they share `.next`. After changing the capture pipeline, restart the dev server (Next's HMR doesn't reliably reload deep server modules).

</details>

---

Built as a showcase for [Steel](https://steel.dev). 🪦
