import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { join } from "node:path";
import { db } from "./client";
import { seed } from "./seed/run";

/** Migrationen anwenden und Seed ausführen (idempotent). Läuft beim Serverstart. */
export function runMigrationsAndSeed(): void {
  migrate(db, { migrationsFolder: join(process.cwd(), "drizzle") });
  seed(db);
}
