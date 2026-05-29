// ABOUTME: Opens the SQLite database (WAL mode) and exposes a singleton Drizzle
// ABOUTME: client. The schema is created on first connect so no migration step
// ABOUTME: is required for a fresh self-hosted install.
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema";
import { config } from "@/lib/config";

// The web process and the in-process worker both touch SQLite, so WAL mode is
// used to allow concurrent readers alongside the single writer.
const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  schedule TEXT NOT NULL DEFAULT 'off',
  next_run_at INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  latest_snapshot_id TEXT,
  title TEXT,
  description TEXT,
  site_name TEXT,
  favicon TEXT,
  author TEXT,
  word_count INTEGER,
  thumbhash TEXT,
  thumb_w INTEGER,
  thumb_h INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  captured_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_pages_created_at ON pages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pages_schedule ON pages (schedule, next_run_at);

CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  title TEXT,
  description TEXT,
  site_name TEXT,
  favicon TEXT,
  author TEXT,
  word_count INTEGER,
  thumbhash TEXT,
  thumb_w INTEGER,
  thumb_h INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  captured_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_snapshots_page ON snapshots (page_id, created_at DESC);
`;

// Add columns introduced after a DB was first created. SQLite's `ALTER TABLE
// ADD COLUMN` is a no-op-safe way to evolve the schema without wiping data.
function migrate(sqlite: Database.Database) {
  const cols = sqlite.prepare("PRAGMA table_info(pages)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "sort_order")) {
    sqlite.exec("ALTER TABLE pages ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0");
    // Seed existing rows so their current (created_at) order is preserved.
    sqlite.exec("UPDATE pages SET sort_order = created_at WHERE sort_order = 0");
  }
}

function open() {
  mkdirSync(dirname(config.databasePath), { recursive: true });
  const sqlite = new Database(config.databasePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(CREATE_TABLE_SQL);
  migrate(sqlite);
  return drizzle(sqlite, { schema });
}

// Reuse one connection across hot reloads in dev to avoid leaking file handles.
const globalForDb = globalThis as unknown as { __linkripperDb?: ReturnType<typeof open> };

export const db = globalForDb.__linkripperDb ?? open();
if (process.env.NODE_ENV !== "production") globalForDb.__linkripperDb = db;

export { schema };
