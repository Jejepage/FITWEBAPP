import { asc, eq } from "drizzle-orm";
import { equipmentProfile, exercise, plan, planSlot } from "@/db/schema";
import type { Db } from "@/db/types";
import { erfuellt } from "@/domain/equipment";
import { istGueltigesDatum } from "@/domain/plan-form";
import { SLOT_VORLAGE, slotKey, type SlotZuordnung } from "@/domain/plan-types";
import type { Muster } from "@/domain/types";

export type Plan = typeof plan.$inferSelect;

export interface PlanEingabe {
  profilId: number;
  startDatum: string;
  einheitenProWoche: number;
  zusatzblock: boolean;
  stufen: Record<Muster, number>;
  vorgaengerId: number | null;
  slots: readonly SlotZuordnung[];
}

export type PlanFehlerCode =
  | "profil_unbekannt"
  | "datum_ungueltig"
  | "einheiten_ungueltig"
  | "slots_unvollstaendig"
  | "uebung_ungueltig"
  | "vorgaenger_unbekannt";

export type PlanErgebnis = { ok: true; id: number } | { ok: false; code: PlanFehlerCode };

/**
 * Speichert einen Plan mit seinen 16 Slots und macht ihn zum aktiven Plan. Ein bisher aktiver
 * Plan wird abgeschlossen (Einheiten und Protokolle bleiben erhalten). Alles in einer Transaktion.
 */
export function createPlan(db: Db, e: PlanEingabe): PlanErgebnis {
  return db.transaction((tx): PlanErgebnis => {
    const profil = tx
      .select()
      .from(equipmentProfile)
      .where(eq(equipmentProfile.id, e.profilId))
      .get();
    if (!profil) return { ok: false, code: "profil_unbekannt" };
    if (!istGueltigesDatum(e.startDatum)) return { ok: false, code: "datum_ungueltig" };
    if (e.einheitenProWoche !== 2 && e.einheitenProWoche !== 3) {
      return { ok: false, code: "einheiten_ungueltig" };
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
        !erfuellt(u.equipment, profil.equipment)
      ) {
        return { ok: false, code: "uebung_ungueltig" };
      }
    }

    tx.update(plan).set({ status: "abgeschlossen" }).where(eq(plan.status, "aktiv")).run();
    const neu = tx
      .insert(plan)
      .values({
        profilId: e.profilId,
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
    .sort((a, b) => (reihenfolge.get(slotKey(a)) ?? 0) - (reihenfolge.get(slotKey(b)) ?? 0));
}

/** IDs aller Übungen eines Plans, z. B. für die Abwechslungs-Regel im Folgeblock. */
export function uebungsIdsVonPlan(db: Db, planId: number): Set<string> {
  return new Set(getPlanSlots(db, planId).map((s) => s.exerciseId));
}
