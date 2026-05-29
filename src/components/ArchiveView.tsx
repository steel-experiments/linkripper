// ABOUTME: Renders archived pages as a draggable thumbnail grid or link list, in
// ABOUTME: compact or expanded density. Drag the grip handle to rearrange; the
// ABOUTME: order is persisted via the reorder server action.
"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DraggableAttributes,
} from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Page } from "@/db/schema";
import { Thumbnail } from "./Thumbnail";
import { PageActions } from "./PageActions";
import { reorderAction } from "@/app/actions";
import { relativeTime, STATUS_LABEL, STATUS_CLASS } from "@/lib/format";
import { SCHEDULE_LABEL } from "@/lib/schedule";
import type { ViewDensity, ViewLayout } from "./ViewControls";

function StatusBadge({ page }: { page: Page }) {
  if (page.status === "done") return null;
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_CLASS[page.status]}`}>
      {STATUS_LABEL[page.status]}
    </span>
  );
}

function ScheduleTag({ page }: { page: Page }) {
  if (page.schedule === "off") return null;
  return <span className="whitespace-nowrap text-accent">⟳ {SCHEDULE_LABEL[page.schedule]}</span>;
}

function Meta({ page }: { page: Page }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
      {page.favicon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={page.favicon} alt="" className="h-3.5 w-3.5 rounded-sm" />
      )}
      <span className="truncate">{page.siteName ?? page.url}</span>
      <span>·</span>
      <span className="whitespace-nowrap">{relativeTime(page.capturedAt ?? page.createdAt)}</span>
      <ScheduleTag page={page} />
    </div>
  );
}

function Preview({ page, className }: { page: Page; className?: string }) {
  if (page.latestSnapshotId && page.thumbhash) {
    return (
      <div className={`relative ${className ?? ""}`}>
        <Thumbnail id={page.latestSnapshotId} thumbhash={page.thumbhash} title={page.title ?? page.url} className="h-full w-full" />
        {page.status !== "done" && (
          <span className="absolute left-1.5 top-1.5">
            <StatusBadge page={page} />
          </span>
        )}
      </div>
    );
  }
  return (
    <div className={`flex items-center justify-center bg-ink-700 ${className ?? ""}`}>
      <StatusBadge page={page} />
    </div>
  );
}

// A small drag affordance. Drag is bound to this handle only, so the card's
// links and action buttons keep working normally.
function Grip({
  attributes,
  listeners,
  className,
}: {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label="Drag to reorder"
      className={`cursor-grab touch-none text-zinc-500 hover:text-zinc-300 active:cursor-grabbing ${className ?? ""}`}
      {...attributes}
      {...listeners}
    >
      ⠿
    </button>
  );
}

function SortableGridCard({ page, density }: { page: Page; density: ViewDensity }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col overflow-hidden rounded-lg border bg-ink-800 ${isDragging ? "border-accent opacity-80" : "border-ink-600"}`}
    >
      <Grip attributes={attributes} listeners={listeners} className="absolute right-1.5 top-1.5 z-10 rounded bg-ink-900/70 px-1.5 leading-none" />
      <Link href={`/archive/${page.id}`} className="block aspect-[16/10]">
        <Preview page={page} className="h-full w-full" />
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link href={`/archive/${page.id}`} className="line-clamp-2 font-medium leading-snug hover:text-accent">
          {page.title ?? page.url}
        </Link>
        <Meta page={page} />
        {density === "expanded" && page.description && (
          <p className="mt-1 line-clamp-3 text-sm text-zinc-400">{page.description}</p>
        )}
        {page.status === "failed" && page.error && (
          <p className="mt-1 line-clamp-2 text-xs text-red-300/80">{page.error}</p>
        )}
        <div className="mt-auto pt-2">
          <PageActions page={page} />
        </div>
      </div>
    </div>
  );
}

function SortableListRow({ page, density }: { page: Page; density: ViewDensity }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  const expanded = density === "expanded";
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 rounded-lg border bg-ink-800 p-3 ${isDragging ? "border-accent opacity-80" : "border-ink-600"}`}
    >
      <Grip attributes={attributes} listeners={listeners} className="mt-0.5 text-lg leading-none" />
      {expanded && (
        <Link href={`/archive/${page.id}`} className="hidden h-16 w-28 shrink-0 overflow-hidden rounded-md sm:block">
          <Preview page={page} className="h-full w-full" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <Link href={`/archive/${page.id}`} className="truncate font-medium hover:text-accent">
            {page.title ?? page.url}
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge page={page} />
            <PageActions page={page} />
          </div>
        </div>
        <div className="mt-1">
          <Meta page={page} />
        </div>
        {expanded && page.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-zinc-400">{page.description}</p>
        )}
        {page.status === "failed" && page.error && (
          <p className="mt-1 line-clamp-1 text-xs text-red-300/80">{page.error}</p>
        )}
      </div>
    </div>
  );
}

export function ArchiveView({
  items,
  layout,
  density,
}: {
  items: Page[];
  layout: ViewLayout;
  density: ViewDensity;
}) {
  const [order, setOrder] = useState<Page[]>(items);
  const [, startTransition] = useTransition();

  // Resync from the server whenever the underlying data changes (new capture,
  // status update, delete, or a persisted reorder).
  const signature = items.map((i) => `${i.id}:${i.status}:${i.thumbhash ?? ""}:${i.title ?? ""}`).join("|");
  useEffect(() => {
    setOrder(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const sensors = useSensors(
    // An 8px activation distance keeps clicks on links/buttons from starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      startTransition(() => reorderAction(next.map((p) => p.id)));
      return next;
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-ink-600 p-12 text-center text-zinc-500">
        Nothing archived yet. Drop a link above to rip your first page. 🪦
      </div>
    );
  }

  const isList = layout === "list";
  const cols =
    density === "compact"
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={order.map((p) => p.id)} strategy={isList ? verticalListSortingStrategy : rectSortingStrategy}>
        {isList ? (
          <div className="flex flex-col gap-2">
            {order.map((p) => (
              <SortableListRow key={p.id} page={p} density={density} />
            ))}
          </div>
        ) : (
          <div className={`grid gap-4 ${cols}`}>
            {order.map((p) => (
              <SortableGridCard key={p.id} page={p} density={density} />
            ))}
          </div>
        )}
      </SortableContext>
    </DndContext>
  );
}
