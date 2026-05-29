// ABOUTME: Delete control that asks for confirmation before submitting. Prevents
// ABOUTME: accidental, irreversible removal of an archived page and its history.
"use client";

import { deleteAction } from "@/app/actions";

export function DeleteButton({ pageId, label }: { pageId: string; label?: string }) {
  return (
    <form
      action={deleteAction}
      onSubmit={(e) => {
        if (!window.confirm("Delete this page and all its snapshots? This can't be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="pageId" value={pageId} />
      <button className="text-xs text-zinc-500 hover:text-red-300" type="submit">
        {label ?? "Delete"}
      </button>
    </form>
  );
}
