// ABOUTME: Global 404 page — shown for unknown routes and missing archive pages.
// ABOUTME: Keeps the LINKRIPPER tone and offers a way back to the archive.
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-6xl font-black tracking-tight">
        4<span className="text-accent">0</span>4
      </p>
      <h2 className="text-lg font-semibold text-zinc-200">This link got ripped clean off 🪦</h2>
      <p className="max-w-md text-sm text-zinc-500">
        The page you&apos;re after isn&apos;t in the archive — it may have been deleted, or never existed.
      </p>
      <Link
        href="/"
        className="rounded-md bg-accent px-4 py-2 font-semibold text-ink-900 transition hover:brightness-110"
      >
        Back to the archive
      </Link>
    </main>
  );
}
