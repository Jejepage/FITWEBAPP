import { asc, eq } from "drizzle-orm";
import { equipmentProfile } from "@/db/schema";
import type { Db } from "@/db/types";

export type Profil = typeof equipmentProfile.$inferSelect;

export function listProfiles(db: Db): Profil[] {
  return db.select().from(equipmentProfile).orderBy(asc(equipmentProfile.id)).all();
}

export function getProfile(db: Db, id: number): Profil | null {
  return db.select().from(equipmentProfile).where(eq(equipmentProfile.id, id)).get() ?? null;
}
