// ABOUTME: Drizzle Kit config for generating SQLite migrations from the schema.
// ABOUTME: Reads the DB path from env (defaults to ./data/linkripper.db).
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? "./data/linkripper.db",
  },
} satisfies Config;
