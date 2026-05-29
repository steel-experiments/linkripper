// ABOUTME: One-shot DB initializer. Importing the db module opens the SQLite file
// ABOUTME: and creates the schema if missing; this script makes that explicit for CI/CLI.
import { db } from "./index";
import { pages } from "./schema";

// Touch the table so any connection/DDL error surfaces with a clear exit code.
db.select().from(pages).limit(0).all();
console.log("LINKRIPPER database is ready.");
