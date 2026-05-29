// ABOUTME: Converts rendered HTML to clean GFM Markdown using Readability for
// ABOUTME: article extraction with a Turndown fallback for non-article pages.
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

// Used for the escalated (Cloudflare session) capture path, where we have raw
// rendered HTML from Puppeteer but no Steel-provided Markdown.
export function htmlToMarkdown(html: string, url: string): string {
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });
  td.use(gfm);
  td.remove(["script", "style", "noscript"]);

  // Fall back to the full body when Readability can't isolate an article.
  const contentHtml = article?.content ?? html;
  return td.turndown(contentHtml);
}
