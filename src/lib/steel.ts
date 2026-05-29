// ABOUTME: Steel capture layer. Fast path: one-shot scrape + screenshot. When a
// ABOUTME: Cloudflare/Turnstile challenge is detected, escalates to a solveCaptcha
// ABOUTME: session driven over CDP and waits for Steel to clear the challenge.
import Steel from "steel-sdk";
import puppeteer from "puppeteer-core";
import { config, steelConfigured } from "./config";
import { htmlToMarkdown } from "./markdown";

export interface CapturedPage {
  html: string;
  markdown: string;
  screenshot: Buffer; // full-page PNG bytes
  metadata: {
    title?: string;
    description?: string;
    siteName?: string;
    favicon?: string;
    author?: string;
    statusCode?: number;
  };
  /** True when the page was captured via the challenge-solving session path. */
  solvedChallenge: boolean;
}

let client: Steel | null = null;

function steel(): Steel {
  if (!steelConfigured()) {
    throw new Error(
      "Steel is not configured. Set STEEL_API_KEY (cloud) or STEEL_BASE_URL (self-hosted) in your .env.",
    );
  }
  if (!client) {
    client = new Steel({
      steelAPIKey: config.steel.apiKey ?? null,
      ...(config.steel.baseURL ? { baseURL: config.steel.baseURL } : {}),
    });
  }
  return client;
}

const useProxy = process.env.STEEL_USE_PROXY === "true";

// Heuristic detection of a Cloudflare / Turnstile interstitial. Kept pure so it
// can be unit-tested without hitting the network.
export function looksLikeChallenge(html: string, title?: string, statusCode?: number): boolean {
  const t = (title ?? "").toLowerCase();
  if (t.includes("just a moment") || t.includes("attention required")) return true;

  const markers = [
    "/cdn-cgi/challenge-platform/",
    "cf-browser-verification",
    "cf_chl_opt",
    "challenge-platform",
    "turnstile",
    "checking your browser before accessing",
    "enable javascript and cookies to continue",
  ];
  const lower = html.toLowerCase();
  const hit = markers.some((m) => lower.includes(m));
  // A 403 alone isn't conclusive; pair it with a marker.
  return hit || (statusCode === 403 && lower.includes("cloudflare"));
}

function siteName(pageUrl: string): string | undefined {
  try {
    return new URL(pageUrl).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function favicon(pageUrl: string): string | undefined {
  try {
    return `${new URL(pageUrl).origin}/favicon.ico`;
  } catch {
    return undefined;
  }
}

async function downloadScreenshot(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download screenshot (${res.status}) from ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

// Fast path — Steel's stateless browser tools. Returns null content for pages
// that need the challenge-solving session path.
async function captureOneShot(url: string): Promise<CapturedPage> {
  const c = steel();
  const delay = config.steel.captureDelay;
  const scrape = await c.scrape({ url, format: ["html", "markdown"], delay });
  const shot = await c.screenshot({ url, fullPage: true, delay });
  const screenshot = await downloadScreenshot(shot.url);
  const meta = scrape.metadata;
  return {
    html: scrape.content.html ?? "",
    markdown: scrape.content.markdown ?? "",
    screenshot,
    metadata: {
      title: meta.title ?? meta.ogTitle,
      description: meta.description ?? meta.ogDescription,
      siteName: siteName(url),
      favicon: favicon(url),
      statusCode: meta.statusCode,
    },
    solvedChallenge: false,
  };
}

// Poll Steel's captcha-status endpoint until no tab is still solving, or timeout.
// steel-sdk@0.7.0 doesn't expose this resource, so we call the REST route.
async function waitForCaptchaCleared(sessionId: string, timeoutMs = 60000, pollMs = 1500) {
  // Captcha solving is a cloud-only feature; skip polling on self-hosted.
  if (!config.steel.apiKey) return;
  const base = config.steel.baseURL ?? "https://api.steel.dev";
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/v1/sessions/${sessionId}/captchas/status`, {
        headers: { "steel-api-key": config.steel.apiKey },
      });
      if (res.ok) {
        const data = (await res.json()) as { pages?: { isSolvingCaptcha?: boolean }[] } | { isSolvingCaptcha?: boolean }[];
        const list = Array.isArray(data) ? data : (data.pages ?? []);
        if (!list.some((p) => p.isSolvingCaptcha)) return;
      }
    } catch {
      // Endpoint may be unavailable (older API / self-hosted); stop polling.
      return;
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
}

// Scroll the whole page in steps to trigger scroll-lazy (IntersectionObserver /
// loading="lazy") images, then wait for them to decode and return to the top so
// the screenshot starts clean. Re-measures height each step because lazy content
// grows the page, and reads documentElement (not just body) so SPA layouts whose
// scroll height lives on <html> are handled correctly.
// The body is passed as a source string (not a function) so no bundler helper
// injection (esbuild's `__name`, etc.) leaks into the page context, which would
// throw "__name is not defined" when the function is serialized for evaluate.
const AUTO_SCROLL_SCRIPT = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const docHeight = () => Math.max(
    document.body.scrollHeight, document.documentElement.scrollHeight,
    document.body.offsetHeight, document.documentElement.offsetHeight
  );
  // Small steps with generous dwell give IntersectionObserver-based lazy loaders
  // time to actually fire and fetch as each section passes through the viewport.
  const step = Math.max(300, Math.floor(window.innerHeight * 0.5));
  let lastHeight = 0, stable = 0;
  // Pass 1: scroll to the bottom (re-measuring, since lazy content grows the page).
  for (let i = 0; i < 400; i++) {
    window.scrollBy(0, step);
    await sleep(400);
    const h = docHeight();
    if (h === lastHeight) stable++; else { stable = 0; lastHeight = h; }
    if (window.scrollY + window.innerHeight >= h - 2 && stable >= 2) break;
  }
  await sleep(800);
  // Pass 2: scroll back up in steps so loaders keyed on upward intersection also
  // fire, giving every section a second chance to load.
  for (let y = docHeight(); y > 0; y -= step) {
    window.scrollTo(0, y);
    await sleep(150);
  }
  window.scrollTo(0, 0);
  await sleep(400);
  // Best-effort: wait for images to finish decoding (capped at 10s).
  const imgs = Array.from(document.images);
  await Promise.race([
    Promise.all(imgs.map((img) => img.complete ? Promise.resolve() : new Promise((res) => {
      img.addEventListener('load', () => res(), { once: true });
      img.addEventListener('error', () => res(), { once: true });
    }))),
    sleep(10000),
  ]);
})()`;

async function autoScroll(page: import("puppeteer-core").Page): Promise<void> {
  await page.evaluate(AUTO_SCROLL_SCRIPT);
}

// Escalated path — a real session with stealth + captcha solving, driven over
// CDP, that waits for Steel to clear Cloudflare and auto-scrolls to load lazy
// images before capturing.
async function captureViaSession(url: string): Promise<CapturedPage> {
  const c = steel();
  const session = await c.sessions.create({
    solveCaptcha: true,
    stealthConfig: { humanizeInteractions: true },
    timeout: 300000,
    ...(useProxy ? { useProxy: true } : {}),
  });

  const wsBase = session.websocketUrl;
  const ws = config.steel.apiKey ? `${wsBase}&apiKey=${config.steel.apiKey}` : wsBase;
  const browser = await puppeteer.connect({ browserWSEndpoint: ws });

  try {
    const page = await browser.newPage();
    // Mark the page visible — many lazy-loaders gate on document visibility, which
    // a CDP-driven tab can otherwise report as "hidden", suppressing the loads.
    await page.bringToFront().catch(() => {});
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Let Steel resolve Turnstile, then scroll to trigger lazy loads and settle.
    await waitForCaptchaCleared(session.id);
    await autoScroll(page);
    await page.waitForNetworkIdle({ idleTime: 1000, timeout: 30000 }).catch(() => {});

    const html = await page.content();
    const pngArray = await page.screenshot({ fullPage: true, type: "png" });
    const screenshot = Buffer.from(pngArray);

    const meta = await page.evaluate(() => ({
      title: document.title,
      description:
        document.querySelector('meta[name="description"]')?.getAttribute("content") ??
        document.querySelector('meta[property="og:description"]')?.getAttribute("content") ??
        undefined,
    }));

    return {
      html,
      markdown: htmlToMarkdown(html, url),
      screenshot,
      metadata: {
        title: meta.title || undefined,
        description: meta.description || undefined,
        siteName: siteName(url),
        favicon: favicon(url),
      },
      solvedChallenge: true,
    };
  } finally {
    await browser.close().catch(() => {});
    await c.sessions.release(session.id).catch(() => {});
  }
}

// Capture everything we archive for a URL.
//
// "basic"    — Steel one-shot only (scrape + screenshot). No challenge escalation,
//              no scrolling, no visibility fix. This is the naive baseline used to
//              demonstrate, by contrast, what Steel's advanced powers add.
// "advanced" — full pipeline: escalate to a solveCaptcha session (always, when
//              scroll-capture is forced, or when a Cloudflare challenge is detected)
//              that auto-scrolls and marks the page visible to load everything.
export async function capturePage(
  url: string,
  mode: "basic" | "advanced" = "advanced",
): Promise<CapturedPage> {
  if (mode === "basic") return captureOneShot(url);
  if (config.steel.scrollCapture) return captureViaSession(url);
  const result = await captureOneShot(url);
  if (looksLikeChallenge(result.html, result.metadata.title, result.metadata.statusCode)) {
    return captureViaSession(url);
  }
  return result;
}
