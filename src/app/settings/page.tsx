// ABOUTME: Settings page — shows archive storage stats and maintenance controls
// ABOUTME: (clean failed captures, prune orphan blobs, vacuum DB, and nuke).
import Link from "next/link";
import { getStorageStats } from "@/lib/maintenance";
import { formatBytes } from "@/lib/format";
import {
  cleanFailedAction,
  pruneBlobsAction,
  vacuumAction,
  nukeArchiveAction,
} from "@/app/actions";
import { MaintenanceButton } from "@/components/MaintenanceButton";

export const dynamic = "force-dynamic";

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-600 py-4 last:border-b-0">
      <div className="max-w-md">
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const stats = getStorageStats();
  const { failed, done, pending, processing } = stats.statusBreakdown;

  return (
    <main className="flex flex-col gap-8">
      <div className="flex items-baseline gap-3">
        <h2 className="text-xl font-bold">Settings</h2>
        <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← back to archive
        </Link>
      </div>

      {/* Storage stats */}
      <section className="rounded-lg border border-ink-600 p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-200">Storage</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-zinc-500">Pages</dt>
            <dd className="text-lg font-semibold">{stats.pageCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Snapshots</dt>
            <dd className="text-lg font-semibold">{stats.snapshotCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Database</dt>
            <dd className="text-lg font-semibold">{formatBytes(stats.dbBytes)}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Blobs</dt>
            <dd className="text-lg font-semibold">{formatBytes(stats.blobBytes)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-zinc-500">
          {done} archived · {failed} failed · {pending + processing} in flight
        </p>
      </section>

      {/* Maintenance */}
      <section>
        <h3 className="mb-1 text-sm font-semibold text-zinc-200">Maintenance</h3>
        <div className="rounded-lg border border-ink-600 px-4">
          <Row
            title="Clean failed captures"
            description={`Delete the ${failed} failed snapshot${failed === 1 ? "" : "s"} and their files. Pages stay so you can retry.`}
          >
            <MaintenanceButton action={cleanFailedAction} label="Clean failed" pendingLabel="Cleaning…" />
          </Row>
          <Row
            title="Prune orphaned blobs"
            description="Remove blob directories on disk that no longer have a matching snapshot — reclaims leaked space."
          >
            <MaintenanceButton action={pruneBlobsAction} label="Prune blobs" pendingLabel="Pruning…" />
          </Row>
          <Row
            title="Vacuum database"
            description="Run VACUUM and flush the WAL to shrink the SQLite file after large deletes."
          >
            <MaintenanceButton action={vacuumAction} label="Vacuum" pendingLabel="Vacuuming…" />
          </Row>
        </div>
      </section>

      {/* Danger zone */}
      <section>
        <h3 className="mb-1 text-sm font-semibold text-red-400">Danger zone</h3>
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-4">
          <Row
            title="Nuke the archive"
            description="Permanently delete every page, snapshot, and stored file. This cannot be undone."
          >
            <MaintenanceButton
              action={nukeArchiveAction}
              label="Nuke everything"
              pendingLabel="Nuking…"
              confirmWord="NUKE"
              danger
            />
          </Row>
        </div>
      </section>
    </main>
  );
}
