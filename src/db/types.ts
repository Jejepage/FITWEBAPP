import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

export type Db = BetterSQLite3Database;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
