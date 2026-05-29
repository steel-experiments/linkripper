// ABOUTME: Root layout for LINKRIPPER — sets metadata, fonts, and the page chrome.
// ABOUTME: Wraps every route in the dark-themed shell.
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { CaptureModeToggle } from "@/components/CaptureModeToggle";
import { getCaptureMode } from "@/lib/settings";

export const metadata: Metadata = {
  title: "LINKRIPPER",
  description: "A personal, self-hosted web archive built on Steel.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const captureMode = getCaptureMode();
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-6xl px-4 py-6">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-ink-600 pb-4">
            <div className="flex items-baseline gap-3">
              <h1 className="text-2xl font-black tracking-tight">
                <Link href="/" className="transition hover:opacity-80">
                  LINK<span className="text-accent">RIPPER</span>
                </Link>
              </h1>
              <span className="hidden text-sm text-zinc-500 sm:inline">your personal web crypt 🪦</span>
            </div>
            <div className="flex items-center gap-4">
              <CaptureModeToggle mode={captureMode} />
              <Link
                href="/settings"
                className="text-xs text-zinc-500 transition hover:text-zinc-300"
              >
                ⚙ settings
              </Link>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
