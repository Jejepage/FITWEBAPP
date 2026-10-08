import type { Db } from "@/db/types";
import { bauSchritte, schrittKey } from "@/domain/ablauf";
import { vorschlagFuerUebung } from "@/domain/progression";
import { formatBereich, rpeText, zielText } from "@/domain/satz-format";
import { kandidatenFuerSlot } from "@/domain/generator";
import { wochenVorgabe, zielBereich } from "@/domain/weeks";
import type { Exercise } from "@/domain/types";
import type { KandidatInfo, TrainingsDaten, UebungInfo } from "@/components/training/typen";
import { alleUebungen } from "./exercises";
import { getPlan, getPlanSlotsMitId } from "./plans";
import { getProfile } from "./profiles";
import { aufwaermenText, getSaetze, getWorkout, letzteWerte, zuSatzWerte } from "./workouts";

type Historie = ReturnType<typeof letzteWerte>;
type Profil = NonNullable<ReturnType<typeof getProfile>>;

function baueUebungInfo(
  u: Exercise,
  woche: number,
  historie: Historie,
  profil: Profil,
  katalog: ReadonlyMap<string, Exercise>,
): UebungInfo {
  const h = historie.get(u.id);
  const ziel = zielBereich(u, woche);
  const vorschlag = vorschlagFuerUebung({
    uebung: u,
    woche,
    letzteSaetze: h?.vorschlagBasis?.saetze ?? [],
    gewichte: profil.gewichte,
  });
  return {
    id: u.id,
    name: u.name,
    muster: u.muster,
    einseitig: u.einseitig,
    belastungsart: u.belastungsart,
    steigerungsart: u.steigerungsart,
    ausfuehrung: u.ausfuehrung,
    fehler: u.fehler,
    hinweise: u.hinweise,
    ziel,
    zielText: zielText(ziel, u.belastungsart, u.einseitig),
    vorschlag,
    schwererName:
      vorschlag.grund === "naechste_stufe" && u.schwererId
        ? (katalog.get(u.schwererId)?.name ?? null)
        : null,
    letzte: h?.anzeige ? { saetze: h.anzeige.saetze, datum: h.anzeige.datum } : null,
  };
}

/** Alles, was der Trainingsbildschirm für eine Einheit braucht. Null, wenn sie nicht existiert. */
export function ladeTrainingsDaten(db: Db, workoutId: number): TrainingsDaten | null {
  const w = getWorkout(db, workoutId);
  if (!w) return null;
  const plan = getPlan(db, w.planId);
  const profil = getProfile(db, w.profilId);
  if (!plan || !profil) return null;

  const slots = getPlanSlotsMitId(db, plan.id).filter((s) => s.einheit === w.einheit);
  const schritte = bauSchritte({
    slots: slots.map((s) => ({
      slotId: s.id,
      block: s.block,
      position: s.position,
      muster: s.muster,
      exerciseId: s.exerciseId,
    })),
    ersetzungen: w.ersetzungen,
    zusatzblock: w.zusatzblock,
    woche: w.woche,
  });
  const saetze = getSaetze(db, w.id);
  const katalog = new Map(alleUebungen(db).map((u) => [u.id, u]));

  const ids = new Set<string>([
    ...schritte.flatMap((s) => [s.exerciseId, s.geplanteUebungId]),
    ...saetze.map((s) => s.exerciseId),
  ]);
  const historie = letzteWerte(db, [...ids], w.id);
  const uebungen: Record<string, UebungInfo> = {};
  for (const id of ids) {
    const u = katalog.get(id);
    if (u) uebungen[id] = baueUebungInfo(u, w.woche, historie, profil, katalog);
  }

  const kandidatenEingabe = {
    uebungen: [...katalog.values()],
    equipment: profil.equipment,
    stufen: plan.stufen,
  };
  const ersatzKandidaten: Record<number, KandidatInfo[]> = {};
  for (const s of slots) {
    if (s.block === "Z" && !w.zusatzblock) continue;
    ersatzKandidaten[s.id] = kandidatenFuerSlot(kandidatenEingabe, s.muster).map((u) => ({
      id: u.id,
      name: u.name,
      stufe: u.stufe,
      einseitig: u.einseitig,
    }));
  }

  const vorgabe = wochenVorgabe(w.woche);
  return {
    workoutId: w.id,
    adHoc: w.adHoc,
    profilName: profil.name,
    einheit: w.einheit,
    woche: w.woche,
    zusatzblock: w.zusatzblock,
    vorgabeText: `${vorgabe.runden} × ${formatBereich(vorgabe.wdhBereich)} Wdh · ${rpeText(vorgabe.rpeMin, vorgabe.rpeMax)}`,
    rpeMin: vorgabe.rpeMin,
    rpeMax: vorgabe.rpeMax,
    aufwaermenText: aufwaermenText(db),
    schritte,
    uebungen,
    ersatzKandidaten,
    gespeichert: saetze.map((s) => ({
      id: s.id,
      key: schrittKey(s.planSlotId ?? 0, s.runde),
      exerciseId: s.exerciseId,
      werte: zuSatzWerte(s),
    })),
    ersetzungen: w.ersetzungen,
  };
}

/** Infos zu einer (Ersatz-)Übung im Rahmen einer Einheit, z. B. nach dem Austausch. */
export function ladeUebungInfo(db: Db, workoutId: number, exerciseId: string): UebungInfo | null {
  const w = getWorkout(db, workoutId);
  const profil = w ? getProfile(db, w.profilId) : null;
  if (!w || !profil) return null;
  const katalog = new Map(alleUebungen(db).map((u) => [u.id, u]));
  const u = katalog.get(exerciseId);
  if (!u) return null;
  return baueUebungInfo(u, w.woche, letzteWerte(db, [exerciseId], w.id), profil, katalog);
}
