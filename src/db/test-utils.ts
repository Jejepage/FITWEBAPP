import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Db } from "./types";
import { seed } from "./seed/run";

export const PROJEKT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** Frische In-Memory-DB mit angewendeten Migrationen, ohne Seed. Nur für Tests. */
export function neueDb(): Db {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: join(PROJEKT_ROOT, "drizzle") });
  return db;
}

/** Wie neueDb(), plus Seed (60 Übungen, 3 Profile, Einstellungen). Nur für Tests. */
export function neueSeedDb(): Db {
  const db = neueDb();
  seed(db);
  return db;
}
