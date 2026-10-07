// Plan-Generator (Spec 2.4 und F3). Rein und deterministisch: kein Math.random, kein Date.
import { erfuellt } from "./equipment";
import {
  SLOT_VORLAGE,
  type GeneratorEingabe,
  type GeneratorErgebnis,
  type KandidatenEingabe,
  type PlanHinweis,
  type PruefEingabe,
  type SlotZuordnung,
} from "./plan-types";
import { MUSTER, type Exercise, type Muster } from "./types";

/** Muster, in denen pro Plan mindestens eine einseitige Übung vorkommen soll. */
const EINSEITIG_MUSTER: readonly Muster[] = ["KN", "HB"];

const begrenzeStufe = (stufe: number): number =>
  Number.isFinite(stufe) ? Math.min(5, Math.max(1, Math.round(stufe))) : 2;

/**
 * Index der Stufe in [L, L-1, …, 1, L+1, …, 5]: erst die Wunschstufe, dann alle
 * niedrigeren (absteigend), erst danach die höheren (aufsteigend).
 */
const stufenRang = (stufe: number, wunsch: number): number =>
  stufe <= wunsch ? wunsch - stufe : stufe - 1;

/** Seedbarer PRNG, liefert Werte in [0, 1). */
function mulberry32(start: number): () => number {
  let a = start;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const nachId = (a: Exercise, b: Exercise): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Kandidaten eines Musters, bestmöglich zuerst. Die Stufe geht vor der Abwechslung
 * (vorherVerwendet); der Seed mischt nur innerhalb gleichwertiger Gruppen.
 */
function sortierteKandidaten(e: KandidatenEingabe, muster: Muster, seed: number): Exercise[] {
  const wunsch = begrenzeStufe(e.stufen[muster]);
  const zufall = seed > 0 ? mulberry32(seed * 1000 + MUSTER.indexOf(muster)) : null;
  return e.uebungen
    .filter((u) => u.muster === muster && u.aktiv && erfuellt(u.equipment, e.equipment))
    .sort(nachId)
    .map((u) => ({
      u,
      rang: stufenRang(u.stufe, wunsch),
      benutzt: e.vorherVerwendet?.has(u.id) ? 1 : 0,
      los: zufall ? zufall() : 0,
    }))
    .sort((a, b) => a.rang - b.rang || a.benutzt - b.benutzt || a.los - b.los)
    .map((x) => x.u);
}

export function kandidatenFuerSlot(e: KandidatenEingabe, muster: Muster): Exercise[] {
  return sortierteKandidaten(e, muster, 0);
}

/**
 * Stellt sicher, dass in KN/HB eine einseitige Übung steht; ersetzt dafür genau einen Slot.
 * Gewählt wird der Slot, dessen bester einseitiger Kandidat den kleinsten Stufenrang hat (also
 * der Wunschstufe seines Musters am nächsten liegt). Bei Gleichstand wird die schlechter
 * eingestufte Übung verdrängt (meist B), danach entscheidet die Reihenfolge der Vorlage.
 * Verglichen wird der Stufenrang, nicht die Listenposition: So hängt die Entscheidung nicht
 * von gleichrangigen Übungen davor ab und damit auch nicht vom Seed.
 */
function erzwingeEinseitig(
  slots: SlotZuordnung[],
  kandidaten: Record<Muster, Exercise[]>,
  stufen: Record<Muster, number>,
): void {
  const relevant = slots.filter((s) => EINSEITIG_MUSTER.includes(s.muster));
  const istEinseitig = (s: SlotZuordnung) =>
    kandidaten[s.muster].some((u) => u.id === s.exerciseId && u.einseitig);
  if (relevant.some(istEinseitig)) return;

  let beste: { slot: SlotZuordnung; wahl: Exercise; rang: number; verdraengt: number } | null =
    null;
  for (const slot of relevant) {
    const liste = kandidaten[slot.muster];
    const einseitige = liste.filter((u) => u.einseitig);
    const andere = slots.find((s) => s.muster === slot.muster && s.einheit !== slot.einheit);
    const wahl = einseitige.find((u) => u.id !== andere?.exerciseId) ?? einseitige[0];
    if (!wahl) continue;
    const rang = stufenRang(wahl.stufe, begrenzeStufe(stufen[slot.muster]));
    const verdraengt = liste.findIndex((u) => u.id === slot.exerciseId);
    const besser =
      !beste || rang < beste.rang || (rang === beste.rang && verdraengt > beste.verdraengt); // sonst gewinnt der frühere Slot
    if (besser) beste = { slot, wahl, rang, verdraengt };
  }
  if (beste) beste.slot.exerciseId = beste.wahl.id;
}

export function generierePlan(e: GeneratorEingabe): GeneratorErgebnis {
  const seed = e.seed ?? 0;
  const kandidaten = Object.fromEntries(
    MUSTER.map((m) => [m, sortierteKandidaten(e, m, seed)]),
  ) as Record<Muster, Exercise[]>;

  const fehlendeMuster = MUSTER.filter((m) => kandidaten[m].length === 0);
  if (fehlendeMuster.length > 0) return { ok: false, fehlendeMuster };

  const slots: SlotZuordnung[] = SLOT_VORLAGE.map((vorlage) => {
    const liste = kandidaten[vorlage.muster];
    // Gibt es nur einen Kandidaten, teilen sich A und B dieselbe Übung.
    const wahl = (vorlage.einheit === "A" ? liste[0] : (liste[1] ?? liste[0])) as Exercise;
    return { ...vorlage, exerciseId: wahl.id };
  });
  erzwingeEinseitig(slots, kandidaten, e.stufen);

  return { ok: true, slots, hinweise: pruefePlan(slots, e) };
}

export function pruefePlan(slots: readonly SlotZuordnung[], e: PruefEingabe): PlanHinweis[] {
  const nachIdMap = new Map(e.uebungen.map((u) => [u.id, u]));
  const bekannt = slots.flatMap((slot) => {
    const uebung = nachIdMap.get(slot.exerciseId);
    return uebung ? [{ slot, uebung }] : [];
  });

  // Reihenfolge ergibt sich aus der Schleife: Muster, dann Code wie in der Union.
  const hinweise: PlanHinweis[] = [];
  for (const muster of MUSTER) {
    const eintraege = bekannt.filter((x) => x.slot.muster === muster);
    const a = eintraege.find((x) => x.slot.einheit === "A");
    const b = eintraege.find((x) => x.slot.einheit === "B");

    if (a && b && a.uebung.id === b.uebung.id) {
      const anzahl = kandidatenFuerSlot(e, muster).length;
      if (anzahl >= 2) hinweise.push({ code: "gleiche_uebung_ab", muster });
      else if (anzahl === 1) hinweise.push({ code: "wenig_auswahl", muster });
    }

    const gewuenscht = begrenzeStufe(e.stufen[muster]);
    const gemeldet = new Set<number>();
    for (const { uebung } of eintraege) {
      if (uebung.stufe === gewuenscht || gemeldet.has(uebung.stufe)) continue;
      gemeldet.add(uebung.stufe);
      hinweise.push({
        code: "stufe_weicht_ab",
        muster,
        gewuenscht,
        tatsaechlich: uebung.stufe,
      });
    }
  }

  const knHb = bekannt.filter((x) => EINSEITIG_MUSTER.includes(x.slot.muster));
  if (!knHb.some((x) => x.uebung.einseitig)) hinweise.push({ code: "einseitig_fehlt" });
  return hinweise;
}
