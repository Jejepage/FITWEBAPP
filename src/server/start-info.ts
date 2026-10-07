import type { Db } from "@/db/types";
import { formatBereich, rpeText } from "@/domain/satz-format";
import { WOCHEN_PRO_BLOCK, type Fokus } from "@/domain/training-types";
import type { Einheit } from "@/domain/types";
import { einheitNachFortschritt, wochenVorgabe } from "@/domain/weeks";
import { getActivePlan } from "./plans";
import { getLaufendesWorkout, zaehleAbgeschlosseneEinheiten } from "./workouts";

export type StartInfo =
  | { art: "kein_plan" }
  | { art: "laufend"; workoutId: number; einheit: Einheit; woche: number }
  | { art: "block_fertig" }
  | {
      art: "faellig";
      einheit: Einheit;
      woche: number;
      wochenPlan: number;
      zusatzblockStandard: boolean;
      vorgabeText: string;
      fokus: Fokus;
    };

/** Was die Startseite anzeigt: laufende Einheit, nächste fällige Einheit oder Block fertig. */
export function ladeStartInfo(db: Db): StartInfo {
  const laufend = getLaufendesWorkout(db);
  if (laufend) {
    return {
      art: "laufend",
      workoutId: laufend.id,
      einheit: laufend.einheit,
      woche: laufend.woche,
    };
  }
  const plan = getActivePlan(db);
  if (!plan) return { art: "kein_plan" };

  const proWoche = plan.einheitenProWoche === 3 ? 3 : 2;
  const n = zaehleAbgeschlosseneEinheiten(db, plan.id);
  const f = einheitNachFortschritt(n, proWoche);
  if (f.blockFertig) return { art: "block_fertig" };

  const v = wochenVorgabe(f.woche);
  return {
    art: "faellig",
    einheit: f.einheit,
    woche: f.woche,
    wochenPlan: WOCHEN_PRO_BLOCK,
    zusatzblockStandard: plan.zusatzblock,
    vorgabeText: `${v.runden} × ${formatBereich(v.wdhBereich)} Wdh · ${rpeText(v.rpeMin, v.rpeMax)}`,
    fokus: v.fokus,
  };
}
