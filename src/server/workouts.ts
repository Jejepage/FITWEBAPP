import { and, count, desc, eq, inArray } from "drizzle-orm";
import { equipmentProfile, exercise, plan, planSlot, setLog, workout } from "@/db/schema";
import type { Db } from "@/db/types";
import { ersetzungenFuerEinheit } from "@/domain/ad-hoc";
import { erfuellt } from "@/domain/equipment";
import { satzEingabeSchema } from "@/domain/satz-eingabe";
import type { SatzWerte } from "@/domain/training-types";
import type { Muster } from "@/domain/types";
import { einheitNachFortschritt, rundenFuerBlock } from "@/domain/weeks";
import { zuExercise } from "./exercises";
import { getSettings } from "./settings";

export type Workout = typeof workout.$inferSelect;
export type GespeicherterSatz = typeof setLog.$inferSelect;

/** Zahl abgeschlossener Einheiten eines Plans (zählt für den Wochenfortschritt). */
export function zaehleAbgeschlosseneEinheiten(db: Db, planId: number): number {
  return (
    db
      .select({ n: count() })
      .from(workout)
      .where(and(eq(workout.planId, planId), eq(workout.status, "abgeschlossen")))
      .get()?.n ?? 0
  );
}

export function getLaufendesWorkout(db: Db): Workout | null {
  return db.select().from(workout).where(eq(workout.status, "laufend")).get() ?? null;
}

export type StartErgebnis =
  | { ok: true; id: number; neu: boolean }
  | { ok: false; code: "kein_plan" | "block_fertig" | "profil_unbekannt" }
  | { ok: false; code: "profil_unmoeglich"; fehlendeMuster: Muster[] };

/**
 * Startet die nächste fällige Einheit des aktiven Plans. Läuft schon eine Einheit, wird diese
 * zurückgegeben (es läuft höchstens eine gleichzeitig).
 *
 * Mit `profilId` ≠ Planprofil ist es eine Ad-hoc-Einheit (Spec F6): Die Übungen, die das Profil
 * nicht erfüllt, werden für diese Einheit ersetzt (`workout.ersetzungen`), der Plan bleibt
 * unverändert. Die Einheit zählt für den Wochenfortschritt, nicht für die Steigerung.
 */
export function startWorkout(
  db: Db,
  opts: { heute: string; zusatzblock?: boolean; profilId?: number },
): StartErgebnis {
  return db.transaction((tx): StartErgebnis => {
    const laufend = tx
      .select({ id: workout.id })
      .from(workout)
      .where(eq(workout.status, "laufend"))
      .get();
    if (laufend) return { ok: true, id: laufend.id, neu: false };

    const p = tx.select().from(plan).where(eq(plan.status, "aktiv")).get();
    if (!p) return { ok: false, code: "kein_plan" };

    const fertig =
      tx
        .select({ n: count() })
        .from(workout)
        .where(and(eq(workout.planId, p.id), eq(workout.status, "abgeschlossen")))
        .get()?.n ?? 0;
    const naechste = einheitNachFortschritt(fertig, p.einheitenProWoche === 3 ? 3 : 2);
    if (naechste.blockFertig) return { ok: false, code: "block_fertig" };

    const adHoc = opts.profilId !== undefined && opts.profilId !== p.profilId;
    let profilId = p.profilId;
    let ersetzungen: Record<string, string> = {};
    if (adHoc) {
      const profil = tx
        .select()
        .from(equipmentProfile)
        .where(eq(equipmentProfile.id, opts.profilId as number))
        .get();
      if (!profil) return { ok: false, code: "profil_unbekannt" };
      const slots = tx
        .select()
        .from(planSlot)
        .where(and(eq(planSlot.planId, p.id), eq(planSlot.einheit, naechste.einheit)))
        .all();
      const r = ersetzungenFuerEinheit({
        slots: slots.map((s) => ({
          slotId: s.id,
          block: s.block,
          muster: s.muster,
          exerciseId: s.exerciseId,
        })),
        uebungen: tx.select().from(exercise).all().map(zuExercise),
        equipment: profil.equipment,
        zusatzblock: opts.zusatzblock ?? p.zusatzblock,
      });
      if (r.fehlendeMuster.length > 0) {
        return { ok: false, code: "profil_unmoeglich", fehlendeMuster: r.fehlendeMuster };
      }
      profilId = profil.id;
      ersetzungen = r.ersetzungen;
    }

    const neu = tx
      .insert(workout)
      .values({
        planId: p.id,
        datum: opts.heute,
        einheit: naechste.einheit,
        woche: naechste.woche,
        profilId,
        adHoc,
        zusatzblock: opts.zusatzblock ?? p.zusatzblock,
        status: "laufend",
        ersetzungen,
      })
      .returning({ id: workout.id })
      .get();
    return { ok: true, id: neu.id, neu: true };
  });
}

export type SatzErgebnis =
  | { ok: true }
  | {
      ok: false;
      code:
        | "werte_ungueltig"
        | "workout_unbekannt"
        | "nicht_laufend"
        | "slot_ungueltig"
        | "uebung_ungueltig"
        | "id_belegt";
    };

/** Wirksame Übung eines Slots in einer Einheit: Ersatz, sonst die geplante Übung. */
function wirksameUebung(w: Workout, slotId: number, geplant: string): string {
  return w.ersetzungen[String(slotId)] ?? geplant;
}

/**
 * Speichert einen erledigten Satz. Idempotent über die Client-UUID: erneutes Senden überschreibt
 * denselben Satz (so wird auch "Satz ändern" gespeichert), es entstehen nie Doppelte.
 */
export function speichereSatz(db: Db, roh: unknown): SatzErgebnis {
  const geprueft = satzEingabeSchema.safeParse(roh);
  if (!geprueft.success) return { ok: false, code: "werte_ungueltig" };
  const s = geprueft.data;

  return db.transaction((tx): SatzErgebnis => {
    const w = tx.select().from(workout).where(eq(workout.id, s.workoutId)).get();
    if (!w) return { ok: false, code: "workout_unbekannt" };
    if (w.status !== "laufend") return { ok: false, code: "nicht_laufend" };

    const slot = tx.select().from(planSlot).where(eq(planSlot.id, s.planSlotId)).get();
    if (!slot || slot.planId !== w.planId || slot.einheit !== w.einheit) {
      return { ok: false, code: "slot_ungueltig" };
    }
    if (slot.block === "Z" && !w.zusatzblock) return { ok: false, code: "slot_ungueltig" };

    if (s.runde > rundenFuerBlock(w.woche, slot.block))
      return { ok: false, code: "slot_ungueltig" };

    const nachId = tx.select().from(setLog).where(eq(setLog.id, s.id)).get();
    // Eine vorhandene ID darf nur ihren eigenen Schritt (Slot und Runde) aktualisieren.
    if (
      nachId &&
      (nachId.workoutId !== w.id || nachId.planSlotId !== slot.id || nachId.runde !== s.runde)
    ) {
      return { ok: false, code: "id_belegt" };
    }
    // Pro Schritt gibt es höchstens einen Satz: eine andere UUID für denselben Schritt
    // (z. B. veraltete Payload) überschreibt den vorhandenen Satz statt eine Zeile anzulegen.
    const nachSchritt = tx
      .select()
      .from(setLog)
      .where(
        and(eq(setLog.workoutId, w.id), eq(setLog.planSlotId, slot.id), eq(setLog.runde, s.runde)),
      )
      .get();
    const vorhanden = nachId ?? nachSchritt;

    // Erlaubt ist die geplante Übung, der aktuelle Ersatz oder die Übung, mit der dieser Satz
    // schon gespeichert wurde (z. B. wiederholtes Senden nach einem späteren Austausch).
    const erlaubt = new Set([wirksameUebung(w, slot.id, slot.exerciseId), slot.exerciseId]);
    if (vorhanden) erlaubt.add(vorhanden.exerciseId);
    if (!erlaubt.has(s.exerciseId)) return { ok: false, code: "uebung_ungueltig" };

    const werte = {
      workoutId: w.id,
      planSlotId: slot.id,
      exerciseId: s.exerciseId,
      runde: s.runde,
      gewicht: s.gewicht,
      wdh: s.wdh,
      sekunden: s.sekunden,
      meter: s.meter,
      rpe: s.rpe,
      tempo: s.tempo,
      erledigt: true,
    };
    if (vorhanden) tx.update(setLog).set(werte).where(eq(setLog.id, vorhanden.id)).run();
    else
      tx.insert(setLog)
        .values({ id: s.id, ...werte })
        .run();
    return { ok: true };
  });
}

export type ErsatzErgebnis =
  | { ok: true; exerciseId: string }
  | {
      ok: false;
      code: "workout_unbekannt" | "nicht_laufend" | "slot_ungueltig" | "uebung_ungueltig";
    };

/**
 * Ersetzt die Übung eines Slots nur für diese Einheit (z. B. Gerät belegt). Erlaubt sind aktive
 * Übungen desselben Musters, die mit dem Equipment des Profils machbar sind; die geplante Übung
 * selbst hebt den Ersatz wieder auf. Der Plan bleibt unverändert.
 */
export function ersetzeUebung(
  db: Db,
  workoutId: number,
  planSlotId: number,
  exerciseId: string,
): ErsatzErgebnis {
  return db.transaction((tx): ErsatzErgebnis => {
    const w = tx.select().from(workout).where(eq(workout.id, workoutId)).get();
    if (!w) return { ok: false, code: "workout_unbekannt" };
    if (w.status !== "laufend") return { ok: false, code: "nicht_laufend" };
    const slot = tx.select().from(planSlot).where(eq(planSlot.id, planSlotId)).get();
    if (!slot || slot.planId !== w.planId || slot.einheit !== w.einheit) {
      return { ok: false, code: "slot_ungueltig" };
    }

    const ersetzungen = { ...w.ersetzungen };
    if (exerciseId === slot.exerciseId) {
      delete ersetzungen[String(slot.id)];
    } else {
      const profil = tx
        .select()
        .from(equipmentProfile)
        .where(eq(equipmentProfile.id, w.profilId))
        .get();
      const u = tx.select().from(exercise).where(eq(exercise.id, exerciseId)).get();
      if (
        !profil ||
        !u ||
        !u.aktiv ||
        u.muster !== slot.muster ||
        !erfuellt(u.equipment, profil.equipment)
      ) {
        return { ok: false, code: "uebung_ungueltig" };
      }
      ersetzungen[String(slot.id)] = exerciseId;
    }
    tx.update(workout).set({ ersetzungen }).where(eq(workout.id, w.id)).run();
    return { ok: true, exerciseId };
  });
}

export type AbschlussErgebnis =
  | { ok: true }
  | { ok: false; code: "workout_unbekannt" | "nicht_laufend" | "keine_saetze" };

export const MAX_NOTIZ_LAENGE = 2000;

/** Schließt eine Einheit ab (zählt für den Fortschritt). Ohne gespeicherten Satz nicht möglich. */
export function beendeWorkout(
  db: Db,
  workoutId: number,
  notiz: string | null,
  jetzt: Date = new Date(),
): AbschlussErgebnis {
  return db.transaction((tx): AbschlussErgebnis => {
    const w = tx.select().from(workout).where(eq(workout.id, workoutId)).get();
    if (!w) return { ok: false, code: "workout_unbekannt" };
    if (w.status !== "laufend") return { ok: false, code: "nicht_laufend" };
    const saetze =
      tx.select({ n: count() }).from(setLog).where(eq(setLog.workoutId, w.id)).get()?.n ?? 0;
    if (saetze === 0) return { ok: false, code: "keine_saetze" };
    const text = notiz?.trim().slice(0, MAX_NOTIZ_LAENGE) || null;
    tx.update(workout)
      .set({ status: "abgeschlossen", notiz: text, beendetAm: jetzt.toISOString() })
      .where(eq(workout.id, w.id))
      .run();
    return { ok: true };
  });
}

/** Bricht eine Einheit ab. Die Sätze bleiben gespeichert, die Einheit zählt nicht für die Woche. */
export function brecheWorkoutAb(
  db: Db,
  workoutId: number,
  jetzt: Date = new Date(),
): AbschlussErgebnis {
  return db.transaction((tx): AbschlussErgebnis => {
    const w = tx.select().from(workout).where(eq(workout.id, workoutId)).get();
    if (!w) return { ok: false, code: "workout_unbekannt" };
    if (w.status !== "laufend") return { ok: false, code: "nicht_laufend" };
    tx.update(workout)
      .set({ status: "abgebrochen", beendetAm: jetzt.toISOString() })
      .where(eq(workout.id, w.id))
      .run();
    return { ok: true };
  });
}

export function getWorkout(db: Db, id: number): Workout | null {
  return db.select().from(workout).where(eq(workout.id, id)).get() ?? null;
}

export function getSaetze(db: Db, workoutId: number): GespeicherterSatz[] {
  return db
    .select()
    .from(setLog)
    .where(eq(setLog.workoutId, workoutId))
    .orderBy(setLog.erstelltAm, setLog.runde)
    .all();
}

export const zuSatzWerte = (s: GespeicherterSatz): SatzWerte => ({
  gewicht: s.gewicht,
  wdh: s.wdh,
  sekunden: s.sekunden,
  meter: s.meter,
  rpe: s.rpe,
  tempo: s.tempo,
});

export interface LetzteEinheit {
  saetze: SatzWerte[];
  datum: string;
  woche: number;
  adHoc: boolean;
}

export interface UebungsHistorie {
  /** Letzte abgeschlossene Einheit mit dieser Übung (zur Anzeige "Letztes Mal") */
  anzeige: LetzteEinheit | null;
  /** Letzte Grundlage für den Vorschlag: nicht Ad-hoc, nicht Woche 6 (Spec 2.5, F6) */
  vorschlagBasis: LetzteEinheit | null;
}

/** Historie je Übung aus abgeschlossenen Einheiten; Abgebrochenes zählt nicht. */
export function letzteWerte(
  db: Db,
  exerciseIds: readonly string[],
  ausserWorkoutId?: number,
): Map<string, UebungsHistorie> {
  const ergebnis = new Map<string, UebungsHistorie>(
    exerciseIds.map((id) => [id, { anzeige: null, vorschlagBasis: null }]),
  );
  if (exerciseIds.length === 0) return ergebnis;

  const zeilen = db
    .select({ satz: setLog, w: workout })
    .from(setLog)
    .innerJoin(workout, eq(setLog.workoutId, workout.id))
    .where(
      and(
        inArray(setLog.exerciseId, [...exerciseIds]),
        eq(workout.status, "abgeschlossen"),
        eq(setLog.erledigt, true),
      ),
    )
    .orderBy(desc(workout.id), setLog.runde)
    .all();

  // Je Übung nach Einheit gruppieren (die Zeilen sind neueste Einheit zuerst sortiert).
  const nachUebung = new Map<string, Map<number, { w: Workout; saetze: GespeicherterSatz[] }>>();
  for (const z of zeilen) {
    if (z.w.id === ausserWorkoutId) continue;
    const einheiten = nachUebung.get(z.satz.exerciseId) ?? new Map();
    const eintrag = einheiten.get(z.w.id) ?? { w: z.w, saetze: [] };
    eintrag.saetze.push(z.satz);
    einheiten.set(z.w.id, eintrag);
    nachUebung.set(z.satz.exerciseId, einheiten);
  }

  for (const [id, einheiten] of nachUebung) {
    const historie = ergebnis.get(id)!;
    for (const { w, saetze } of einheiten.values()) {
      const eintrag: LetzteEinheit = {
        saetze: saetze.map(zuSatzWerte),
        datum: w.datum,
        woche: w.woche,
        adHoc: w.adHoc,
      };
      historie.anzeige ??= eintrag;
      if (!w.adHoc && w.woche < 6) {
        historie.vorschlagBasis ??= eintrag;
        break;
      }
    }
  }
  return ergebnis;
}

/** Aufwärmtext aus den Einstellungen. */
export const aufwaermenText = (db: Db): string => getSettings(db).aufwaermenText;
