// Nur für Tests: legt einen aktiven Plan an (erste passende Übung je Slot, kein Generator).
import { eq } from "drizzle-orm";
import { plan, setLog, workout } from "@/db/schema";
import type { Db } from "@/db/types";
import { erfuellt } from "@/domain/equipment";
import { SLOT_VORLAGE } from "@/domain/plan-types";
import type { SatzWerte } from "@/domain/training-types";
import { MUSTER, type Block, type Einheit, type Muster } from "@/domain/types";
import { einheitNachFortschritt, rundenFuerBlock } from "@/domain/weeks";
import { alleUebungen } from "./exercises";
import { createPlan, getPlanSlotsMitId } from "./plans";
import { listProfiles } from "./profiles";

export function legePlanAn(
  db: Db,
  opts: { profil?: string; einheitenProWoche?: 2 | 3; zusatzblock?: boolean } = {},
): { planId: number; slotIds: Record<string, number> } {
  const profil = listProfiles(db).find((p) => p.seedKey === (opts.profil ?? "studio"))!;
  const katalog = alleUebungen(db);
  const stufen = Object.fromEntries(MUSTER.map((m) => [m, 2])) as Record<Muster, number>;
  const r = createPlan(db, {
    profilId: profil.id,
    startDatum: "2026-10-07",
    einheitenProWoche: opts.einheitenProWoche ?? 2,
    zusatzblock: opts.zusatzblock ?? false,
    stufen,
    vorgaengerId: null,
    slots: SLOT_VORLAGE.map((v) => {
      const kandidaten = katalog.filter(
        (u) => u.muster === v.muster && erfuellt(u.equipment, profil.equipment),
      );
      // A und B bekommen verschiedene Übungen, soweit vorhanden
      return { ...v, exerciseId: kandidaten[(v.einheit === "A" ? 0 : 1) % kandidaten.length]!.id };
    }),
  });
  if (!r.ok) throw new Error(`Plan konnte nicht angelegt werden: ${r.code}`);
  const slotIds = Object.fromEntries(
    getPlanSlotsMitId(db, r.id).map((s) => [`${s.einheit}-${s.block}-${s.position}`, s.id]),
  );
  return { planId: r.id, slotIds };
}

export interface TestSatzKontext {
  woche: number;
  einheit: Einheit;
  /** Laufende Nummer der Einheit im Block, ab 0 */
  nummer: number;
  muster: Muster;
  block: Block;
  exerciseId: string;
  runde: number;
}

const LEER: SatzWerte = {
  gewicht: null,
  wdh: null,
  sekunden: null,
  meter: null,
  rpe: null,
  tempo: false,
};

/**
 * Legt einen Plan mit abgeschlossenen Einheiten an (Datum je Einheit ein Tag ab 2026-10-07).
 * `satz` liefert die Werte je Satz; Standard: 10 kg × 10 bei RPE 7. Direkt per SQL, ohne Server-
 * Funktionen, damit Tests beliebige Verläufe aufbauen können.
 */
export function legeBlockAn(
  db: Db,
  opts: {
    einheiten: number;
    einheitenProWoche?: 2 | 3;
    zusatzblock?: boolean;
    satz?: (k: TestSatzKontext) => Partial<SatzWerte> | null;
    adHoc?: (nummer: number) => boolean;
  },
): { planId: number; workoutIds: number[]; slotIds: Record<string, number> } {
  const proWoche = opts.einheitenProWoche ?? 2;
  const { planId, slotIds } = legePlanAn(db, {
    einheitenProWoche: proWoche,
    zusatzblock: opts.zusatzblock ?? false,
  });
  const slots = getPlanSlotsMitId(db, planId);
  const planZeile = db.select().from(plan).where(eq(plan.id, planId)).get();
  const workoutIds: number[] = [];
  for (let n = 0; n < opts.einheiten; n++) {
    const f = einheitNachFortschritt(n, proWoche);
    const tag = String(7 + n).padStart(2, "0");
    const w = db
      .insert(workout)
      .values({
        planId,
        datum: `2026-${n < 25 ? "10" : "11"}-${n < 25 ? tag : String(n - 24).padStart(2, "0")}`,
        einheit: f.einheit,
        woche: f.woche,
        profilId: planZeile!.profilId,
        adHoc: opts.adHoc?.(n) ?? false,
        zusatzblock: opts.zusatzblock ?? false,
        status: "abgeschlossen",
        beendetAm: "2026-10-07T10:00:00.000Z",
      })
      .returning({ id: workout.id })
      .get();
    workoutIds.push(w.id);
    for (const slot of slots.filter((s) => s.einheit === f.einheit)) {
      if (slot.block === "Z" && !opts.zusatzblock) continue;
      for (let runde = 1; runde <= rundenFuerBlock(f.woche, slot.block); runde++) {
        const werte = opts.satz
          ? opts.satz({
              woche: f.woche,
              einheit: f.einheit,
              nummer: n,
              muster: slot.muster,
              block: slot.block,
              exerciseId: slot.exerciseId,
              runde,
            })
          : { gewicht: 10, wdh: 10, rpe: 7 };
        if (werte === null) continue;
        db.insert(setLog)
          .values({
            id: `test-${w.id}-${slot.id}-${runde}`.padEnd(8, "0"),
            workoutId: w.id,
            planSlotId: slot.id,
            exerciseId: slot.exerciseId,
            runde,
            ...LEER,
            ...werte,
            erledigt: true,
          })
          .run();
      }
    }
  }
  return { planId, workoutIds, slotIds };
}
