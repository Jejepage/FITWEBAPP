import { asc, count, eq, ne } from "drizzle-orm";
import { equipmentProfile, plan, workout } from "@/db/schema";
import type { Db, Tx } from "@/db/types";
import type { FormFehler, ProfilDaten } from "@/domain/profile-form";

export type Profil = typeof equipmentProfile.$inferSelect;

export function listProfiles(db: Db): Profil[] {
  return db.select().from(equipmentProfile).orderBy(asc(equipmentProfile.id)).all();
}

export function getProfile(db: Db, id: number): Profil | null {
  return db.select().from(equipmentProfile).where(eq(equipmentProfile.id, id)).get() ?? null;
}

/** Das Standardprofil; gibt es (z. B. nach manuellem Eingriff) keins, das mit der kleinsten ID. */
export function getStandardProfil(db: Db): Profil | null {
  const alle = listProfiles(db);
  return alle.find((p) => p.istStandard) ?? alle[0] ?? null;
}

export type ProfilErgebnis = { ok: true; id: number } | { ok: false; fehler: FormFehler };

const NAME_BELEGT = "Ein Profil mit diesem Namen gibt es schon.";

function nameVergeben(tx: Tx, name: string, ausser?: number): boolean {
  const gesucht = name.trim().toLowerCase();
  return tx
    .select({ id: equipmentProfile.id, name: equipmentProfile.name })
    .from(equipmentProfile)
    .all()
    .some((p) => p.id !== ausser && p.name.trim().toLowerCase() === gesucht);
}

export function createProfile(db: Db, daten: ProfilDaten): ProfilErgebnis {
  return db.transaction((tx): ProfilErgebnis => {
    if (nameVergeben(tx, daten.name)) return { ok: false, fehler: { name: NAME_BELEGT } };
    const erstes =
      tx.select({ id: equipmentProfile.id }).from(equipmentProfile).limit(1).all().length === 0;
    const istStandard = daten.istStandard || erstes;
    if (istStandard) tx.update(equipmentProfile).set({ istStandard: false }).run();
    const zeile = tx
      .insert(equipmentProfile)
      .values({
        name: daten.name,
        equipment: daten.equipment,
        gewichte: daten.gewichte,
        istStandard,
      })
      .returning({ id: equipmentProfile.id })
      .get();
    return { ok: true, id: zeile.id };
  });
}

export function updateProfile(db: Db, id: number, daten: ProfilDaten): ProfilErgebnis {
  return db.transaction((tx): ProfilErgebnis => {
    const aktuell = tx.select().from(equipmentProfile).where(eq(equipmentProfile.id, id)).get();
    if (!aktuell) return { ok: false, fehler: { _form: "Profil nicht gefunden." } };
    if (nameVergeben(tx, daten.name, id)) return { ok: false, fehler: { name: NAME_BELEGT } };
    // Das aktuelle Standardprofil bleibt Standard; gewechselt wird, indem man ein anderes dazu macht.
    const istStandard = aktuell.istStandard || daten.istStandard;
    if (istStandard && !aktuell.istStandard) {
      tx.update(equipmentProfile)
        .set({ istStandard: false })
        .where(ne(equipmentProfile.id, id))
        .run();
    }
    tx.update(equipmentProfile)
      .set({ name: daten.name, equipment: daten.equipment, gewichte: daten.gewichte, istStandard })
      .where(eq(equipmentProfile.id, id))
      .run();
    return { ok: true, id };
  });
}

export function deleteProfile(db: Db, id: number): ProfilErgebnis {
  return db.transaction((tx): ProfilErgebnis => {
    const profil = tx.select().from(equipmentProfile).where(eq(equipmentProfile.id, id)).get();
    if (!profil) return { ok: false, fehler: { _form: "Profil nicht gefunden." } };

    const gesamt = tx.select({ n: count() }).from(equipmentProfile).get()!.n;
    if (gesamt <= 1)
      return { ok: false, fehler: { _form: "Das letzte Profil kann nicht gelöscht werden." } };

    const plaene = tx.select({ n: count() }).from(plan).where(eq(plan.profilId, id)).get()!.n;
    const einheiten = tx.select({ n: count() }).from(workout).where(eq(workout.profilId, id)).get()!
      .n;
    if (plaene + einheiten > 0) {
      return {
        ok: false,
        fehler: {
          _form: `Das Profil wird noch verwendet (${plaene} Plan/Pläne, ${einheiten} Einheit(en)) und kann nicht gelöscht werden. Du kannst es umbenennen oder anpassen.`,
        },
      };
    }

    tx.delete(equipmentProfile).where(eq(equipmentProfile.id, id)).run();
    if (profil.istStandard) {
      const neuer = tx
        .select()
        .from(equipmentProfile)
        .orderBy(asc(equipmentProfile.id))
        .limit(1)
        .get();
      if (neuer)
        tx.update(equipmentProfile)
          .set({ istStandard: true })
          .where(eq(equipmentProfile.id, neuer.id))
          .run();
    }
    return { ok: true, id };
  });
}
