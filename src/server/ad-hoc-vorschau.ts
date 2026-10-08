// Vorschau für den Ad-hoc-Start (Spec F6): welche Übungen würden mit einem anderen Profil
// anstelle der Planübungen der fälligen Einheit trainiert?
import type { Db } from "@/db/types";
import { ersetzungenFuerProfil } from "@/domain/ad-hoc";
import type { Block, Einheit, Muster } from "@/domain/types";
import { einheitNachFortschritt } from "@/domain/weeks";
import { alleUebungen } from "./exercises";
import { getActivePlan, getPlanSlotsMitId } from "./plans";
import { getProfile } from "./profiles";
import { zaehleAbgeschlosseneEinheiten } from "./workouts";

export interface AdHocZeile {
  slotId: number;
  block: Block;
  position: number;
  muster: Muster;
  geplantId: string;
  geplantName: string;
  geplantStufe: number;
  /** Heutige Übung; gleich der geplanten, wenn nichts ersetzt wird */
  heuteId: string;
  heuteName: string;
  heuteStufe: number;
  ersetzt: boolean;
}

export type AdHocVorschau =
  | { art: "kein_plan" | "block_fertig" | "profil_unbekannt" }
  | {
      art: "ok";
      einheit: Einheit;
      woche: number;
      profilName: string;
      /** Das Profil ist das des Plans: normale Einheit, kein Ad-hoc */
      istPlanProfil: boolean;
      zeilen: AdHocZeile[];
      fehlendeMuster: Muster[];
    };

export function ladeAdHocVorschau(db: Db, profilId: number, zusatzblock: boolean): AdHocVorschau {
  const plan = getActivePlan(db);
  if (!plan) return { art: "kein_plan" };
  const naechste = einheitNachFortschritt(
    zaehleAbgeschlosseneEinheiten(db, plan.id),
    plan.einheitenProWoche === 3 ? 3 : 2,
  );
  if (naechste.blockFertig) return { art: "block_fertig" };
  const profil = getProfile(db, profilId);
  if (!profil) return { art: "profil_unbekannt" };

  const katalog = alleUebungen(db);
  const nachId = new Map(katalog.map((u) => [u.id, u]));
  const slots = getPlanSlotsMitId(db, plan.id).filter(
    (s) => s.einheit === naechste.einheit && (zusatzblock || s.block !== "Z"),
  );
  const istPlanProfil = profil.id === plan.profilId;
  const r = istPlanProfil
    ? { ersetzungen: {} as Record<string, string>, fehlendeMuster: [] as Muster[] }
    : ersetzungenFuerProfil({
        slots: slots.map((s) => ({ slotId: s.id, muster: s.muster, exerciseId: s.exerciseId })),
        uebungen: katalog,
        equipment: profil.equipment,
      });

  return {
    art: "ok",
    einheit: naechste.einheit,
    woche: naechste.woche,
    profilName: profil.name,
    istPlanProfil,
    fehlendeMuster: r.fehlendeMuster,
    zeilen: slots.map((s) => {
      const geplant = nachId.get(s.exerciseId);
      const heuteId = r.ersetzungen[String(s.id)] ?? s.exerciseId;
      const heute = nachId.get(heuteId);
      return {
        slotId: s.id,
        block: s.block,
        position: s.position,
        muster: s.muster,
        geplantId: s.exerciseId,
        geplantName: geplant?.name ?? s.exerciseId,
        geplantStufe: geplant?.stufe ?? 0,
        heuteId,
        heuteName: heute?.name ?? heuteId,
        heuteStufe: heute?.stufe ?? 0,
        ersetzt: heuteId !== s.exerciseId,
      };
    }),
  };
}
