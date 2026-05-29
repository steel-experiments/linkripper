// ABOUTME: Page detail view — schedule control, the selected snapshot's content
// ABOUTME: (screenshot + Markdown + raw HTML), and the snapshot history timeline.
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPage, listSnapshots } from "@/lib/queries";
import { readArtifact, hasArtifact } from "@/lib/storage";
import { relativeTime, STATUS_LABEL, STATUS_CLASS } from "@/lib/format";
import { PageActions } from "@/components/PageActions";
import { ScheduleSelect } from "@/components/ScheduleSelect";
import { CopyMarkdownButton } from "@/components/CopyMarkdownButton";
import { SnapshotCard } from "@/components/SnapshotCard";

export const dynamic = "force-dynamic";

export default async function ArchiveDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const { id } = await params;
  const { s } = await searchParams;
  const page = getPage(id);
  if (!page) notFound();

  const snaps = listSnapshots(id);
  // Pick the requested snapshot, else the latest done one, else the newest row.
  const selected =
    snaps.find((x) => x.id === s) ??
    snaps.find((x) => x.id === page.latestSnapshotId) ??
    snaps.find((x) => x.status === "done") ??
    snaps[0];

  const md = selected ? await readArtifact(selected.id, "markdown") : null;
  const markdown = md?.toString("utf-8") ?? "";
  const hasShot = selected ? hasArtifact(selected.id, "screenshot") : false;
  const hasHtml = selected ? hasArtifact(selected.id, "html") : false;

  return (
    <main className="flex flex-col gap-6">
      <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← Back to archive
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold">{page.title ?? page.url}</h2>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_CLASS[page.status]}`}>
            {STATUS_LABEL[page.status]}
          </span>
        </div>
        <a href={page.url} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">
          {page.url} ↗
        </a>
        {page.description && <p className="text-zinc-400">{page.description}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
          {page.siteName && <span>{page.siteName}</span>}
          {selected?.wordCount != null && <span>{selected.wordCount.toLocaleString()} words</span>}
          <span>{snaps.length} {snaps.length === 1 ? "snapshot" : "snapshots"}</span>
          {selected?.capturedAt && <span>captured {relativeTime(selected.capturedAt)}</span>}
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <ScheduleSelect pageId={page.id} value={page.schedule} />
          <PageActions page={page} />
        </div>

        {page.status === "failed" && page.error && (
          <p className="mt-1 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            {page.error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {hasHtml && (
            <a className="text-xs text-zinc-400 hover:underline" href={`/api/blob/${selected!.id}/html`} target="_blank">
              Raw HTML
            </a>
          )}
          {markdown && (
            <a className="text-xs text-zinc-400 hover:underline" href={`/api/blob/${selected!.id}/markdown`} target="_blank">
              Markdown
            </a>
          )}
          {hasShot && (
            <a className="text-xs text-zinc-400 hover:underline" href={`/api/blob/${selected!.id}/screenshot`} target="_blank">
              Full screenshot
            </a>
          )}
        </div>
      </div>

      {snaps.length > 1 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            History <span className="font-normal normal-case text-zinc-600">— click a capture to view, set as default, or delete</span>
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {snaps.map((snap) => (
              <SnapshotCard
                key={snap.id}
                id={snap.id}
                pageId={page.id}
                status={snap.status}
                thumbhash={snap.thumbhash}
                timeLabel={relativeTime(snap.capturedAt ?? snap.createdAt)}
                captureMode={snap.captureMode}
                isDefault={snap.id === page.latestSnapshotId}
                isViewing={selected?.id === snap.id}
                viewHref={`/archive/${page.id}?s=${snap.id}`}
              />
            ))}
          </div>
        </section>
      )}

      {hasShot && (
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Full-page screenshot</h3>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/blob/${selected!.id}/screenshot`} alt={page.title ?? page.url} className="w-full rounded-lg border border-ink-600" />
        </section>
      )}

      {markdown && (
        <section>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Extracted content</h3>
            <CopyMarkdownButton markdown={markdown} />
          </div>
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg border border-ink-600 bg-ink-800 p-4 text-sm leading-relaxed text-zinc-300">
            {markdown}
          </pre>
        </section>
      )}
    </main>
  );
}
