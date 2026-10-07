import { eq } from "drizzle-orm";
import { settings } from "@/db/schema";
import { standardSettings } from "@/db/seed/defaults";
import type { Db } from "@/db/types";
import type { SettingsFormWerte } from "@/domain/settings-form";

export type Einstellungen = typeof settings.$inferSelect;

/** Liest die Einstellungen; fehlt die Zeile (sollte der Seed verhindern), wird sie angelegt. */
export function getSettings(db: Db): Einstellungen {
  const zeile = db.select().from(settings).where(eq(settings.id, 1)).get();
  if (zeile) return zeile;
  db.insert(settings).values(standardSettings).onConflictDoNothing().run();
  return db.select().from(settings).where(eq(settings.id, 1)).get()!;
}

export function updateSettings(db: Db, werte: SettingsFormWerte): void {
  getSettings(db);
  db.update(settings)
    .set({
      stufen: werte.stufen,
      einheitenProWoche: werte.einheitenProWoche,
      zusatzblock: werte.zusatzblock,
      aufwaermenText: werte.aufwaermenText,
    })
    .where(eq(settings.id, 1))
    .run();
}

/** Speichert den Zeitpunkt der Bestätigung des Hinweises (nur beim ersten Mal). */
export function hinweisAkzeptieren(db: Db, jetzt: Date = new Date()): void {
  const s = getSettings(db);
  if (s.hinweisAkzeptiertAm) return;
  db.update(settings)
    .set({ hinweisAkzeptiertAm: jetzt.toISOString() })
    .where(eq(settings.id, 1))
    .run();
}
