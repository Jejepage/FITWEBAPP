// "Nächstes Mal" (Spec F5): Vorschlag je Übung direkt nach einer Einheit, aus den Sätzen dieser
// Einheit. Wird berechnet, nicht gespeichert (wie die Vorbelegung im Training).
import { and, count, eq, lte } from "drizzle-orm";
import { workout } from "@/db/schema";
import type { Db } from "@/db/types";
import { vorschlagFuerUebung } from "@/domain/progression";
import { zielText } from "@/domain/satz-format";
import { WOCHEN_PRO_BLOCK, type Vorschlag } from "@/domain/training-types";
import { naechsteEinheitMit, zielBereich } from "@/domain/weeks";
import { alleUebungen } from "./exercises";
import { getPlan } from "./plans";
import { ladeEinheit } from "./verlauf";
import { getWorkout } from "./workouts";

export interface NaechstesMalEintrag {
  exerciseId: string;
  name: string;
  /** Woche der nächsten Einheit mit dieser Übung */
  woche: number;
  zielText: string;
  vorschlag: Vorschlag;
  /** Name der nächsten Stufe, falls der Vorschlag darauf hinweist */
  schwererName: string | null;
}

export type NaechstesMal =
  | { art: "ok"; eintraege: NaechstesMalEintrag[] }
  | { art: "keine"; grund: "nicht_abgeschlossen" | "entlastung" };

/** Abgeschlossene Einheiten des Plans bis einschließlich `workoutId` (Stand nach dieser Einheit). */
function zaehleBis(db: Db, planId: number, workoutId: number): number {
  return (
    db
      .select({ n: count() })
      .from(workout)
      .where(
        and(
          eq(workout.planId, planId),
          eq(workout.status, "abgeschlossen"),
          lte(workout.id, workoutId),
        ),
      )
      .get()?.n ?? 0
  );
}

export function ladeNaechstesMal(db: Db, workoutId: number): NaechstesMal {
  const w = getWorkout(db, workoutId);
  if (!w || w.status !== "abgeschlossen") return { art: "keine", grund: "nicht_abgeschlossen" };
  // Woche 6 ist Entlastung (Spec 2.5).
  if (w.woche >= WOCHEN_PRO_BLOCK) return { art: "keine", grund: "entlastung" };

  const plan = getPlan(db, w.planId);
  if (!plan) return { art: "keine", grund: "nicht_abgeschlossen" };
  const proWoche = plan.einheitenProWoche === 3 ? 3 : 2;
  // Stand nach dieser Einheit: Anzahl abgeschlossener Einheiten bis einschließlich dieser.
  const naechste = naechsteEinheitMit(w.einheit, zaehleBis(db, plan.id, w.id), proWoche);

  const katalog = new Map(alleUebungen(db).map((u) => [u.id, u]));
  const eintraege: NaechstesMalEintrag[] = [];
  // Reihenfolge wie im Ablauf der Einheit (Block, Position).
  for (const g of ladeEinheit(db, w.id)?.gruppen ?? []) {
    const id = g.exerciseId;
    const saetze = g.saetze.map((x) => x.werte);
    const u = katalog.get(id);
    if (!u) continue;
    const vorschlag = vorschlagFuerUebung({
      uebung: u,
      woche: naechste.woche,
      letzteSaetze: saetze,
      gewichte: plan.gewichte,
    });
    eintraege.push({
      exerciseId: id,
      name: u.name,
      woche: naechste.woche,
      zielText: zielText(zielBereich(u, naechste.woche), u.belastungsart, u.einseitig),
      vorschlag,
      schwererName:
        vorschlag.grund === "naechste_stufe" && u.schwererId
          ? (katalog.get(u.schwererId)?.name ?? null)
          : null,
    });
  }
  return { art: "ok", eintraege };
}
