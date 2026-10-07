import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { equipmentProfile, exercise, settings } from "../schema";
import { uebungenSeed } from "./data";
import { standardProfile, standardSettings } from "./defaults";

/**
 * Legt Katalog, Standardprofile und Standardeinstellungen an – nur, was fehlt
 * (insert-if-missing). Bereits vorhandene Zeilen, auch vom Nutzer geänderte,
 * bleiben unverändert. Mehrfaches Ausführen ist unschädlich.
 */
export function seed(db: BetterSQLite3Database): void {
  db.transaction((tx) => {
    for (const u of uebungenSeed) {
      tx.insert(exercise)
        .values({ ...u, bild: null, aktiv: true, pruefstatus: "zu_pruefen" })
        .onConflictDoNothing({ target: exercise.id })
        .run();
    }
    for (const p of standardProfile) {
      tx.insert(equipmentProfile).values(p).onConflictDoNothing({ target: equipmentProfile.seedKey }).run();
    }
    tx.insert(settings).values(standardSettings).onConflictDoNothing({ target: settings.id }).run();
  });
}
