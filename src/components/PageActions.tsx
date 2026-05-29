// ABOUTME: Per-page action row: capture now / retry, open original, and delete
// ABOUTME: (with confirmation). Used on cards, list rows, and the detail view.
import { captureNowAction } from "@/app/actions";
import { DeleteButton } from "./DeleteButton";
import type { Page } from "@/db/schema";

export function PageActions({ page }: { page: Page }) {
  const inFlight = page.status === "pending" || page.status === "processing";
  return (
    <div className="flex items-center gap-2">
      {!inFlight && (
        <form action={captureNowAction}>
          <input type="hidden" name="pageId" value={page.id} />
          <button
            className={`text-xs hover:underline ${page.status === "failed" ? "text-amber-300" : "text-zinc-400 hover:text-zinc-200"}`}
            type="submit"
          >
            {page.status === "failed" ? "Retry" : "Capture now"}
          </button>
        </form>
      )}
      <a
        href={page.url}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-zinc-400 hover:text-zinc-200 hover:underline"
      >
        Open ↗
      </a>
      <DeleteButton pageId={page.id} />
    </div>
  );
}
