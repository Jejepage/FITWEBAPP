import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const dbPath = process.env.DB_PATH ?? "./data/fit.db";

function open() {
  if (dbPath !== ":memory:") mkdirSync(dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return { sqlite, db: drizzle(sqlite) };
}

// Eine Verbindung pro Prozess; globalThis verhindert Mehrfach-Öffnen im Dev-Hot-Reload.
const globalForDb = globalThis as unknown as { __fitDb?: ReturnType<typeof open> };

export const { sqlite, db } = (globalForDb.__fitDb ??= open());
