// Lesende Abfragen für den Verlauf (Spec F7): Einheitenliste, Einheit im Detail, Übungsverlauf
// und Blockübersicht. Abgebrochene Einheiten zählen nicht.
import { and, desc, eq, sql } from "drizzle-orm";
import { equipmentProfile, exercise, plan, planSlot, setLog, workout } from "@/db/schema";
import type { Db } from "@/db/types";
import { BLOCK_REIHENFOLGE } from "@/domain/ablauf";
import type { SatzWerte } from "@/domain/training-types";
import { WOCHEN_PRO_BLOCK } from "@/domain/training-types";
import type { Block, Einheit, Muster } from "@/domain/types";
import { uebungsVerlauf, type UebungsVerlauf, type VerlaufEinheit } from "@/domain/verlauf";
import { alleUebungen, getExercise } from "./exercises";
import { zuSatzWerte } from "./workouts";

export interface EinheitKurz {
  id: number;
  datum: string;
  einheit: Einheit;
  woche: number;
  adHoc: boolean;
  zusatzblock: boolean;
  saetze: number;
  notiz: string | null;
}

/** Abgeschlossene Einheiten, neueste zuerst. */
export function listeEinheiten(db: Db, limit?: number): { liste: EinheitKurz[]; gesamt: number } {
  const zeilen = db
    .select({
      id: workout.id,
      datum: workout.datum,
      einheit: workout.einheit,
      woche: workout.woche,
      adHoc: workout.adHoc,
      zusatzblock: workout.zusatzblock,
      notiz: workout.notiz,
      // Ausgeschrieben, weil Drizzle Spalten in der Unterabfrage sonst ohne Tabelle schreibt.
      saetze: sql<number>`(select count(*) from set_log where set_log.workout_id = workout.id)`,
    })
    .from(workout)
    .where(eq(workout.status, "abgeschlossen"))
    .orderBy(desc(workout.datum), desc(workout.id))
    .all();
  return { liste: limit ? zeilen.slice(0, limit) : zeilen, gesamt: zeilen.length };
}

export interface EinheitGruppe {
  exerciseId: string;
  name: string;
  muster: Muster;
  /** Anders als geplant (Ersatzübung) */
  ersetzt: boolean;
  saetze: { runde: number; werte: SatzWerte }[];
}

export interface EinheitDetail {
  id: number;
  datum: string;
  einheit: Einheit;
  woche: number;
  adHoc: boolean;
  zusatzblock: boolean;
  status: "laufend" | "abgeschlossen" | "abgebrochen";
  notiz: string | null;
  profilName: string;
  gruppen: EinheitGruppe[];
}

/** Eine Einheit mit ihren Sätzen, gruppiert je Übung in Ablaufreihenfolge. Null, wenn unbekannt. */
export function ladeEinheit(db: Db, id: number): EinheitDetail | null {
  const w = db.select().from(workout).where(eq(workout.id, id)).get();
  if (!w) return null;
  const profil = db
    .select({ name: equipmentProfile.name })
    .from(equipmentProfile)
    .where(eq(equipmentProfile.id, w.profilId))
    .get();
  const slots = db.select().from(planSlot).where(eq(planSlot.planId, w.planId)).all();
  const slotNach = new Map(slots.map((s) => [s.id, s]));
  const blockRang = (b: Block | undefined) => (b ? BLOCK_REIHENFOLGE.indexOf(b) : 99);
  const saetze = db.select().from(setLog).where(eq(setLog.workoutId, id)).all();
  // Reihenfolge der Übungen: wie im Ablauf (Block, Position), unabhängig von der Runde.
  const katalog = new Map(alleUebungen(db).map((u) => [u.id, u]));
  const gruppenMap = new Map<string, EinheitGruppe>();
  const slotReihenfolge = saetze.sort((a, b) => {
    const sa = a.planSlotId ? slotNach.get(a.planSlotId) : undefined;
    const sb = b.planSlotId ? slotNach.get(b.planSlotId) : undefined;
    return (
      blockRang(sa?.block) - blockRang(sb?.block) ||
      (sa?.position ?? 99) - (sb?.position ?? 99) ||
      a.runde - b.runde
    );
  });
  for (const s of slotReihenfolge) {
    const u = katalog.get(s.exerciseId);
    const slot = s.planSlotId ? slotNach.get(s.planSlotId) : undefined;
    const g = gruppenMap.get(s.exerciseId) ?? {
      exerciseId: s.exerciseId,
      name: u?.name ?? s.exerciseId,
      muster: (u?.muster ?? slot?.muster ?? "KN") as Muster,
      ersetzt: slot ? slot.exerciseId !== s.exerciseId : false,
      saetze: [],
    };
    g.saetze.push({ runde: s.runde, werte: zuSatzWerte(s) });
    gruppenMap.set(s.exerciseId, g);
  }
  return {
    id: w.id,
    datum: w.datum,
    einheit: w.einheit,
    woche: w.woche,
    adHoc: w.adHoc,
    zusatzblock: w.zusatzblock,
    status: w.status,
    notiz: w.notiz,
    profilName: profil?.name ?? "",
    gruppen: [...gruppenMap.values()],
  };
}

export interface UebungMitVerlauf {
  id: string;
  name: string;
  muster: Muster;
  einheiten: number;
}

/** Übungen mit mindestens einem Satz in einer abgeschlossenen Einheit. */
export function uebungenMitVerlauf(db: Db): UebungMitVerlauf[] {
  const zeilen = db
    .select({
      id: exercise.id,
      name: exercise.name,
      muster: exercise.muster,
      einheiten: sql<number>`count(distinct ${setLog.workoutId})`,
    })
    .from(setLog)
    .innerJoin(workout, eq(setLog.workoutId, workout.id))
    .innerJoin(exercise, eq(setLog.exerciseId, exercise.id))
    .where(and(eq(workout.status, "abgeschlossen"), eq(setLog.erledigt, true)))
    .groupBy(exercise.id)
    .orderBy(exercise.id)
    .all();
  return zeilen;
}

export interface UebungsVerlaufDaten {
  id: string;
  name: string;
  muster: Muster;
  videoUrl: string | null;
  verlauf: UebungsVerlauf;
}

/** Verlauf einer Übung über alle abgeschlossenen Einheiten, älteste zuerst. Null, wenn unbekannt. */
export function ladeUebungsVerlauf(db: Db, exerciseId: string): UebungsVerlaufDaten | null {
  const u = getExercise(db, exerciseId);
  if (!u) return null;
  const zeilen = db
    .select({ satz: setLog, w: workout })
    .from(setLog)
    .innerJoin(workout, eq(setLog.workoutId, workout.id))
    .where(
      and(
        eq(setLog.exerciseId, exerciseId),
        eq(workout.status, "abgeschlossen"),
        eq(setLog.erledigt, true),
      ),
    )
    .orderBy(workout.datum, workout.id, setLog.runde)
    .all();
  const einheiten = new Map<number, VerlaufEinheit & { saetze: SatzWerte[] }>();
  for (const { satz, w } of zeilen) {
    const e = einheiten.get(w.id) ?? {
      workoutId: w.id,
      datum: w.datum,
      woche: w.woche,
      einheit: w.einheit,
      adHoc: w.adHoc,
      saetze: [],
    };
    e.saetze.push(zuSatzWerte(satz));
    einheiten.set(w.id, e);
  }
  return {
    id: u.id,
    name: u.name,
    muster: u.muster,
    videoUrl: u.videoUrl,
    verlauf: uebungsVerlauf([...einheiten.values()], u.belastungsart),
  };
}

export interface BlockZeile {
  planId: number;
  startDatum: string;
  profilName: string;
  status: "aktiv" | "abgeschlossen";
  einheitenProWoche: number;
  /** Geplante Einheiten des Blocks (6 × pro Woche) */
  geplant: number;
  /** Abgeschlossene, nicht abgebrochene Einheiten des Plans (auch Ad-hoc) */
  absolviert: number;
  /** Je Woche: wie viele Einheiten erledigt sind (höchstens pro Woche) */
  wochen: number[];
}

/** Alle Blöcke, der aktive zuerst, dann neueste zuerst. */
export function blockUebersicht(db: Db): BlockZeile[] {
  const plaene = db
    .select({ p: plan, profilName: equipmentProfile.name })
    .from(plan)
    .innerJoin(equipmentProfile, eq(plan.profilId, equipmentProfile.id))
    .orderBy(desc(plan.id))
    .all();
  const zaehler = new Map(
    db
      .select({ planId: workout.planId, n: sql<number>`count(*)` })
      .from(workout)
      .where(eq(workout.status, "abgeschlossen"))
      .groupBy(workout.planId)
      .all()
      .map((z) => [z.planId, z.n]),
  );
  const zeilen = plaene.map(({ p, profilName }): BlockZeile => {
    const absolviert = zaehler.get(p.id) ?? 0;
    const geplant = WOCHEN_PRO_BLOCK * p.einheitenProWoche;
    const wochen = Array.from({ length: WOCHEN_PRO_BLOCK }, (_, i) =>
      Math.max(0, Math.min(p.einheitenProWoche, absolviert - i * p.einheitenProWoche)),
    );
    return {
      planId: p.id,
      startDatum: p.startDatum,
      profilName,
      status: p.status,
      einheitenProWoche: p.einheitenProWoche,
      geplant,
      absolviert,
      wochen,
    };
  });
  return zeilen.sort((a, b) => Number(b.status === "aktiv") - Number(a.status === "aktiv"));
}
