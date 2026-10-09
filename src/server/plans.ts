import { asc, eq } from "drizzle-orm";
import { exercise, plan, planSlot, workout } from "@/db/schema";
import type { Db } from "@/db/types";
import { erfuellt } from "@/domain/equipment";
import { istGueltigesDatum } from "@/domain/plan-form";
import { SLOT_VORLAGE, slotKey, type SlotZuordnung } from "@/domain/plan-types";
import { EQUIPMENT_AUSWAHL, MUSTER, type EquipmentArt, type Gewichte, type Muster } from "@/domain/types";

export type Plan = typeof plan.$inferSelect;

export interface PlanEingabe {
  /** Verfügbares Equipment dieses Plans */
  equipment: readonly EquipmentArt[];
  /** Verfügbare Hantelgewichte in kg */
  gewichte: Gewichte;
  startDatum: string;
  einheitenProWoche: number;
  zusatzblock: boolean;
  stufen: Record<Muster, number>;
  vorgaengerId: number | null;
  slots: readonly SlotZuordnung[];
}

export type PlanFehlerCode =
  | "equipment_ungueltig"
  | "datum_ungueltig"
  | "einheiten_ungueltig"
  | "stufen_ungueltig"
  | "slots_unvollstaendig"
  | "uebung_ungueltig"
  | "vorgaenger_unbekannt";

export type PlanErgebnis = { ok: true; id: number } | { ok: false; code: PlanFehlerCode };

/** Gültige Auswahl ohne Doppelte in fester Reihenfolge; null bei Unbekanntem (z. B. "keins"). */
function bereinige(equipment: readonly string[]): EquipmentArt[] | null {
  const gueltig = new Set<string>(EQUIPMENT_AUSWAHL);
  if (!equipment.every((a) => gueltig.has(a))) return null;
  return EQUIPMENT_AUSWAHL.filter((a) => equipment.includes(a));
}

/**
 * Speichert einen Plan mit seinen 16 Slots und macht ihn zum aktiven Plan. Ein bisher aktiver
 * Plan wird abgeschlossen (Einheiten und Protokolle bleiben erhalten). Alles in einer Transaktion.
 */
export function createPlan(db: Db, e: PlanEingabe): PlanErgebnis {
  return db.transaction((tx): PlanErgebnis => {
    const equipment = bereinige(e.equipment);
    if (!equipment) return { ok: false, code: "equipment_ungueltig" };
    if (!istGueltigesDatum(e.startDatum)) return { ok: false, code: "datum_ungueltig" };
    if (e.einheitenProWoche !== 2 && e.einheitenProWoche !== 3) {
      return { ok: false, code: "einheiten_ungueltig" };
    }
    const stufeOk = (s: number) => Number.isInteger(s) && s >= 1 && s <= 5;
    if (!MUSTER.every((m) => stufeOk(e.stufen[m]))) {
      return { ok: false, code: "stufen_ungueltig" };
    }
    if (
      e.vorgaengerId !== null &&
      !tx.select({ id: plan.id }).from(plan).where(eq(plan.id, e.vorgaengerId)).get()
    ) {
      return { ok: false, code: "vorgaenger_unbekannt" };
    }

    // Genau die 16 Slots der Vorlage, jeder einmal.
    const nachKey = new Map(e.slots.map((s) => [slotKey(s), s]));
    if (e.slots.length !== SLOT_VORLAGE.length || nachKey.size !== SLOT_VORLAGE.length) {
      return { ok: false, code: "slots_unvollstaendig" };
    }
    const katalog = new Map(
      tx
        .select()
        .from(exercise)
        .all()
        .map((u) => [u.id, u]),
    );
    for (const vorlage of SLOT_VORLAGE) {
      const s = nachKey.get(slotKey(vorlage));
      if (!s || s.muster !== vorlage.muster) return { ok: false, code: "slots_unvollstaendig" };
      const u = katalog.get(s.exerciseId);
      if (
        !u ||
        !u.aktiv ||
        u.muster !== vorlage.muster ||
        !erfuellt(u.equipment, equipment)
      ) {
        return { ok: false, code: "uebung_ungueltig" };
      }
    }

    // Der bisher aktive Plan wird abgeschlossen; eine darin laufende Einheit wird abgebrochen
    // (ihre Sätze bleiben gespeichert, sie zählt aber nicht für den Fortschritt).
    tx.update(workout)
      .set({ status: "abgebrochen", beendetAm: new Date().toISOString() })
      .where(eq(workout.status, "laufend"))
      .run();
    tx.update(plan).set({ status: "abgeschlossen" }).where(eq(plan.status, "aktiv")).run();
    const neu = tx
      .insert(plan)
      .values({
        equipment,
        gewichte: e.gewichte,
        startDatum: e.startDatum,
        einheitenProWoche: e.einheitenProWoche,
        zusatzblock: e.zusatzblock,
        stufen: e.stufen,
        status: "aktiv",
        vorgaengerId: e.vorgaengerId,
      })
      .returning({ id: plan.id })
      .get();
    tx.insert(planSlot)
      .values(
        SLOT_VORLAGE.map((v) => ({
          planId: neu.id,
          einheit: v.einheit,
          block: v.block,
          position: v.position,
          muster: v.muster,
          exerciseId: nachKey.get(slotKey(v))!.exerciseId,
        })),
      )
      .run();
    return { ok: true, id: neu.id };
  });
}

export type EquipmentErgebnis = { ok: true } | { ok: false; code: "plan_unbekannt" | "equipment_ungueltig" };

/**
 * Ändert Equipment und Hantelgewichte eines bestehenden Plans (z. B. nach dem Kauf eines Geräts).
 * Die Übungen des Plans bleiben, wie sie sind. Was das neue Equipment nicht mehr erfüllt, wird beim
 * Start der nächsten Einheit durch passende Übungen ersetzt; neue Möglichkeiten erscheinen in den
 * Tauschlisten. Eine laufende Einheit sieht die Änderung in ihren Tauschlisten und Gewichten.
 */
export function setzePlanEquipment(
  db: Db,
  planId: number,
  equipment: readonly EquipmentArt[],
  gewichte: Gewichte,
): EquipmentErgebnis {
  const arten = bereinige(equipment);
  if (!arten) return { ok: false, code: "equipment_ungueltig" };
  const r = db.update(plan).set({ equipment: arten, gewichte }).where(eq(plan.id, planId)).run();
  return r.changes > 0 ? { ok: true } : { ok: false, code: "plan_unbekannt" };
}

export function getPlan(db: Db, id: number): Plan | null {
  return db.select().from(plan).where(eq(plan.id, id)).get() ?? null;
}

export function getActivePlan(db: Db): Plan | null {
  return db.select().from(plan).where(eq(plan.status, "aktiv")).get() ?? null;
}

/** Slots eines Plans in der Reihenfolge der Vorlage. */
export function getPlanSlots(db: Db, planId: number): SlotZuordnung[] {
  const reihenfolge = new Map(SLOT_VORLAGE.map((v, i) => [slotKey(v), i]));
  return db
    .select()
    .from(planSlot)
    .where(eq(planSlot.planId, planId))
    .orderBy(asc(planSlot.id))
    .all()
    .map((s) => ({
      einheit: s.einheit,
      block: s.block,
      position: s.position,
      muster: s.muster,
      exerciseId: s.exerciseId,
    }))
    .sort(
      (a, b) =>
        (reihenfolge.get(slotKey(a)) ?? Number.MAX_SAFE_INTEGER) -
        (reihenfolge.get(slotKey(b)) ?? Number.MAX_SAFE_INTEGER),
    );
}

export interface PlanSlotMitId extends SlotZuordnung {
  id: number;
}

/** Slots eines Plans samt Datenbank-ID (für den Trainingsablauf), in Vorlagenreihenfolge. */
export function getPlanSlotsMitId(db: Db, planId: number): PlanSlotMitId[] {
  const reihenfolge = new Map(SLOT_VORLAGE.map((v, i) => [slotKey(v), i]));
  return db
    .select()
    .from(planSlot)
    .where(eq(planSlot.planId, planId))
    .all()
    .map((s) => ({
      id: s.id,
      einheit: s.einheit,
      block: s.block,
      position: s.position,
      muster: s.muster,
      exerciseId: s.exerciseId,
    }))
    .sort((a, b) => (reihenfolge.get(slotKey(a)) ?? 99) - (reihenfolge.get(slotKey(b)) ?? 99));
}

/** IDs aller Übungen eines Plans, z. B. für die Abwechslungs-Regel im Folgeblock. */
export function uebungsIdsVonPlan(db: Db, planId: number): Set<string> {
  return new Set(getPlanSlots(db, planId).map((s) => s.exerciseId));
}
