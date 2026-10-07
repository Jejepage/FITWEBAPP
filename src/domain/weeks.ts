// Wochenlogik des 6-Wochen-Blocks (Spec 2.3, 2.5). Rein: keine Datenbank, keine UI.
import { parseBereich, type Bereich } from "./bereich";
import {
  RUNDEN_ZUSATZBLOCK,
  WOCHEN_PRO_BLOCK,
  type FortschrittEinheit,
  type WochenVorgabe,
} from "./training-types";
import type { Block, Einheit, Exercise } from "./types";

type WochenWerte = Omit<WochenVorgabe, "woche">;

const WOCHEN_TABELLE: Record<number, WochenWerte> = {
  1: { runden: 3, wdhBereich: { min: 10, max: 12 }, rpeMin: 6, rpeMax: 6, fokus: "technik" },
  2: { runden: 3, wdhBereich: { min: 10, max: 12 }, rpeMin: 7, rpeMax: 7, fokus: "einarbeiten" },
  3: { runden: 3, wdhBereich: { min: 8, max: 12 }, rpeMin: 7, rpeMax: 8, fokus: "steigern" },
  4: { runden: 3, wdhBereich: { min: 8, max: 12 }, rpeMin: 7, rpeMax: 8, fokus: "steigern" },
  5: { runden: 3, wdhBereich: { min: 8, max: 12 }, rpeMin: 7, rpeMax: 8, fokus: "steigern" },
  6: { runden: 2, wdhBereich: { min: 8, max: 12 }, rpeMin: 6, rpeMax: 6, fokus: "entlasten" },
};

/** Begrenzt auf 1..6; nicht ganzzahlige Werte werden gerundet, NaN wird zu 1. */
function begrenzeWoche(woche: number): number {
  if (Number.isNaN(woche)) return 1;
  return Math.min(WOCHEN_PRO_BLOCK, Math.max(1, Math.round(woche)));
}

export function wochenVorgabe(woche: number): WochenVorgabe {
  const w = begrenzeWoche(woche);
  const werte = WOCHEN_TABELLE[w] as WochenWerte;
  return { woche: w, ...werte, wdhBereich: { ...werte.wdhBereich } };
}

export function rundenFuerBlock(woche: number, block: Block): number {
  if (block === "Z") return RUNDEN_ZUSATZBLOCK;
  return wochenVorgabe(woche).runden;
}

/**
 * Zielbereich einer Übung in einer Woche. Nur Wiederholungsübungen mit dem Standardbereich 8–12
 * folgen dem Wochenbereich; alle anderen behalten ihren eigenen Bereich.
 */
export function zielBereich(
  uebung: Pick<Exercise, "standardBereich" | "belastungsart">,
  woche: number,
): Bereich {
  const geparst = parseBereich(uebung.standardBereich);
  if (!geparst) return { min: 8, max: 12 };
  const istStandard = geparst.min === 8 && geparst.max === 12 && geparst.einheit === undefined;
  if (uebung.belastungsart === "wdh" && istStandard) return wochenVorgabe(woche).wdhBereich;
  return geparst.einheit
    ? { min: geparst.min, max: geparst.max, einheit: geparst.einheit }
    : { min: geparst.min, max: geparst.max };
}

/** Welche Einheit (A/B) und Woche als Nächstes fällig ist, aus der Zahl abgeschlossener Einheiten. */
export function einheitNachFortschritt(abgeschlossen: number, proWoche: 2 | 3): FortschrittEinheit {
  const n = Number.isFinite(abgeschlossen) ? Math.max(0, Math.floor(abgeschlossen)) : 0;
  const woche = Math.floor(n / proWoche) + 1;
  const positionInWoche = (n % proWoche) + 1;
  const ungeradeWoche = woche % 2 === 1;
  // 2x: A, B. 3x: ungerade Wochen A, B, A; gerade Wochen B, A, B.
  const istA = proWoche === 2 ? positionInWoche === 1 : ungeradeWoche === (positionInWoche !== 2);
  const einheit: Einheit = istA ? "A" : "B";
  return { einheit, woche, positionInWoche, blockFertig: n >= WOCHEN_PRO_BLOCK * proWoche };
}
