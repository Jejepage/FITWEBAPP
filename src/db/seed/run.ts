import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { exerciseSeedSchema } from "@/domain/schemas";
import { equipmentProfile, exercise, settings } from "../schema";
import { uebungenSeed } from "./data";
import { standardProfile, standardSettings } from "./defaults";

/**
 * Legt Katalog, Standardprofile und Standardeinstellungen an – nur, was fehlt
 * (insert-if-missing). Bereits vorhandene Zeilen, auch vom Nutzer geänderte,
 * bleiben unverändert. Mehrfaches Ausführen ist unschädlich.
 *
 * Katalog: Übungen werden nie gelöscht, nur deaktiviert (Spec F1); das Wiederanlegen
 * fehlender Zeilen betrifft daher nur frische Datenbanken.
 * Profile: nur beim allerersten Lauf (leere Tabelle), damit gelöschte oder umgestellte
 * Standardprofile nicht zurückkehren und es nie zwei Standardprofile gibt.
 */
export function seed(db: BetterSQLite3Database): void {
  const katalog = uebungenSeed.map((u) => exerciseSeedSchema.parse(u)); // lieber früh scheitern

  db.transaction((tx) => {
    for (const u of katalog) {
      tx.insert(exercise)
        .values({ ...u, bild: null, aktiv: true, pruefstatus: "zu_pruefen" })
        .onConflictDoNothing({ target: exercise.id })
        .run();
    }
    if (tx.select({ id: equipmentProfile.id }).from(equipmentProfile).limit(1).all().length === 0) {
      tx.insert(equipmentProfile).values(standardProfile).run();
    }
    tx.insert(settings).values(standardSettings).onConflictDoNothing({ target: settings.id }).run();
  });
}
