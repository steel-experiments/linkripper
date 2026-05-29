// ABOUTME: Drizzle schema for LINKRIPPER. A `pages` row is one tracked URL (with
// ABOUTME: its schedule + denormalized latest-capture display fields); `snapshots`
// ABOUTME: is the append-only history of captures, one blob dir per snapshot.
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Capture lifecycle for a single snapshot.
export type CaptureStatus = "pending" | "processing" | "done" | "failed";

// Recurring re-capture cadence for a page.
export type Schedule = "off" | "hourly" | "every6h" | "daily" | "weekly";

export const pages = sqliteTable("pages", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),

  // Recurring schedule + when the next run is due (null when schedule is "off").
  schedule: text("schedule").$type<Schedule>().notNull().default("off"),
  nextRunAt: integer("next_run_at", { mode: "timestamp_ms" }),

  // Manual sort position for drag-to-rearrange. Higher = earlier in the grid;
  // seeded from created_at so new pages land on top until reordered.
  sortOrder: integer("sort_order").notNull().default(0),

  // Status/error of the most recent capture attempt (drives the card badge).
  status: text("status").$type<CaptureStatus>().notNull().default("pending"),
  error: text("error"),

  // Denormalized display fields from the latest DONE snapshot — lets the grid
  // render from `pages` alone, while `snapshots` keeps the full history.
  latestSnapshotId: text("latest_snapshot_id"),
  title: text("title"),
  description: text("description"),
  siteName: text("site_name"),
  favicon: text("favicon"),
  author: text("author"),
  wordCount: integer("word_count"),
  thumbhash: text("thumbhash"),
  thumbW: integer("thumb_w"),
  thumbH: integer("thumb_h"),

  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  capturedAt: integer("captured_at", { mode: "timestamp_ms" }),
});

export const snapshots = sqliteTable("snapshots", {
  id: text("id").primaryKey(),
  pageId: text("page_id")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),

  status: text("status").$type<CaptureStatus>().notNull().default("pending"),
  error: text("error"),

  // Per-capture metadata (a page's title/desc can change between snapshots).
  title: text("title"),
  description: text("description"),
  siteName: text("site_name"),
  favicon: text("favicon"),
  author: text("author"),
  wordCount: integer("word_count"),
  thumbhash: text("thumbhash"),
  thumbW: integer("thumb_w"),
  thumbH: integer("thumb_h"),

  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  capturedAt: integer("captured_at", { mode: "timestamp_ms" }),
});

export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;
export type Snapshot = typeof snapshots.$inferSelect;
export type NewSnapshot = typeof snapshots.$inferInsert;
