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
// loading="lazy") images, then return to the top so the screenshot starts clean.
async function autoScroll(page: import("puppeteer-core").Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let total = 0;
      const step = 600;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        total += step;
        if (total >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 150);
    });
    window.scrollTo(0, 0);
  });
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
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Let Steel resolve Turnstile, then scroll to load lazy images and settle.
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

// Capture everything we archive for a URL. When scroll-capture is enabled, every
// page goes through the auto-scrolling session path; otherwise we take the fast
// one-shot and only escalate to a session when a Cloudflare challenge appears.
export async function capturePage(url: string): Promise<CapturedPage> {
  if (config.steel.scrollCapture) return captureViaSession(url);
  const result = await captureOneShot(url);
  if (looksLikeChallenge(result.html, result.metadata.title, result.metadata.statusCode)) {
    return captureViaSession(url);
  }
  return result;
}
