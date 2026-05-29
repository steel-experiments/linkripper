// ABOUTME: The "drop a link" form. Submits the URL to the addUrl server action
// ABOUTME: and shows a pending state while the row is created.
"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { addUrlAction } from "@/app/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-accent px-4 py-2 font-semibold text-ink-900 transition hover:brightness-110 disabled:opacity-50"
    >
      {pending ? "Ripping…" : "Rip it"}
    </button>
  );
}

export function AddUrlForm() {
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      action={async (formData) => {
        await addUrlAction(formData);
        ref.current?.reset();
      }}
      className="flex gap-2"
    >
      <input
        type="text"
        name="url"
        required
        placeholder="Drop a link to archive… (e.g. example.com/article)"
        className="flex-1 rounded-md border border-ink-600 bg-ink-800 px-4 py-2 text-zinc-100 placeholder:text-zinc-500 focus:border-accent focus:outline-none"
      />
      <SubmitButton />
    </form>
  );
}
