// ABOUTME: Home page — the archive index. Renders the add-URL form, view controls,
// ABOUTME: and the grid/list of archived pages straight from SQLite.
import { listPages, hasInFlight } from "@/lib/queries";
import { AddUrlForm } from "@/components/AddUrlForm";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ArchiveView } from "@/components/ArchiveView";
import {
  ViewControls,
  type ViewDensity,
  type ViewLayout,
} from "@/components/ViewControls";
import { steelConfigured } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; density?: string }>;
}) {
  const sp = await searchParams;
  const layout: ViewLayout = sp.view === "list" ? "list" : "grid";
  const density: ViewDensity = sp.density === "expanded" ? "expanded" : "compact";

  const items = listPages();
  const inFlight = hasInFlight(items);

  return (
    <main className="flex flex-col gap-6">
      <AutoRefresh active={inFlight} />

      {!steelConfigured() && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          Steel isn&apos;t configured yet. Set <code>STEEL_API_KEY</code> (cloud) or{" "}
          <code>STEEL_BASE_URL</code> (self-hosted) in your <code>.env</code> to start archiving.
        </div>
      )}

      <AddUrlForm />

      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500">
          {items.length} {items.length === 1 ? "page" : "pages"} archived
        </span>
        <ViewControls layout={layout} density={density} />
      </div>

      <ArchiveView items={items} layout={layout} density={density} />
    </main>
  );
}
