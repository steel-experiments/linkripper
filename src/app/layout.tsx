// ABOUTME: Root layout for LINKRIPPER — sets metadata, fonts, and the page chrome.
// ABOUTME: Wraps every route in the dark-themed shell.
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "LINKRIPPER",
  description: "A personal, self-hosted web archive built on Steel.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-6xl px-4 py-6">
          <header className="mb-6 flex items-baseline gap-3 border-b border-ink-600 pb-4">
            <h1 className="text-2xl font-black tracking-tight">
              <Link href="/" className="transition hover:opacity-80">
                LINK<span className="text-accent">RIPPER</span>
              </Link>
            </h1>
            <span className="text-sm text-zinc-500">your personal web crypt 🪦</span>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
