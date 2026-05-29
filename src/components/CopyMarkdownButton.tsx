// ABOUTME: Copies a snapshot's extracted Markdown to the clipboard, with brief
// ABOUTME: "Copied!" feedback. Client component (needs the Clipboard API).
"use client";

import { useState } from "react";

export function CopyMarkdownButton({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API needs a secure context (https/localhost); ignore otherwise.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-md border border-ink-600 px-2.5 py-1 text-xs font-medium text-zinc-300 transition hover:border-accent hover:text-zinc-100"
    >
      {copied ? "Copied!" : "Copy as Markdown"}
    </button>
  );
}
