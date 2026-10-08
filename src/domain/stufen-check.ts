// Stufen-Check am Blockende (Spec 2.5, F5): Empfehlung je Bewegungsmuster, ob die Übungsstufe
// im nächsten Block steigt, sinkt oder bleibt. Rein: keine Datenbank, keine UI.
import {
  RPE_ERHOEHEN_MAX,
  RPE_SENKEN_AB,
  STUFEN_CHECK_MIN_EINHEITEN,
  STUFEN_CHECK_WOCHEN,
  type StufenCheckEingabe,
  type StufenCheckEinheit,
  type StufenCheckErgebnis,
  type StufenCheckFn,
  type StufenEmpfehlung,
  type StufenGrund,
} from "./stufen-check-types";
import type { SatzWerte } from "./training-types";
import { MUSTER, type Muster } from "./types";
import { zielBereich } from "./weeks";

const STUFE_MIN = 1;
const STUFE_MAX = 5;
const STUFE_STANDARD = 2;

/** Bewertung einer einzelnen Einheit; nur für Einheiten mit mindestens einem Messwert. */
interface EinheitBefund {
  untergrenzeVerfehlt: boolean;
  zuHart: boolean;
  zielErreicht: boolean;
}

/** Stufe auf 1..5 begrenzen; nicht ganzzahlige Werte werden gerundet, Nicht-Zahlen werden zu 2. */
function begrenzeStufe(stufe: unknown): number {
  if (typeof stufe !== "number" || Number.isNaN(stufe)) return STUFE_STANDARD;
  return Math.min(STUFE_MAX, Math.max(STUFE_MIN, Math.round(stufe)));
}

function istGewerteteWoche(woche: number): boolean {
  return (STUFEN_CHECK_WOCHEN as readonly number[]).includes(woche);
}

/** Messwert eines Satzes passend zur Belastungsart der Übung. */
function messwert(art: StufenCheckEinheit["uebung"]["belastungsart"], s: SatzWerte): number | null {
  return art === "wdh" ? s.wdh : art === "zeit" ? s.sekunden : s.meter;
}

/** Bewertet eine Einheit; `null`, wenn kein Satz einen verwertbaren Messwert hat. */
function bewerteEinheit(einheit: StufenCheckEinheit): EinheitBefund | null {
  const art = einheit.uebung.belastungsart;
  const ziel = zielBereich(einheit.uebung, einheit.woche);
  const saetze = einheit.saetze.flatMap((s) => {
    const wert = messwert(art, s);
    return wert === null ? [] : [{ wert, rpe: s.rpe }];
  });
  if (saetze.length === 0) return null;
  return {
    untergrenzeVerfehlt: saetze.some((s) => s.wert < ziel.min),
    zuHart: saetze.some((s) => s.rpe !== null && s.rpe >= RPE_SENKEN_AB),
    zielErreicht: saetze.every(
      (s) => s.wert >= ziel.max && (s.rpe === null || s.rpe <= RPE_ERHOEHEN_MAX),
    ),
  };
}

function ergebnis(
  muster: Muster,
  aktuell: number,
  empfehlung: StufenEmpfehlung,
  grund: StufenGrund,
  einheiten: number,
): StufenCheckErgebnis {
  const neu =
    empfehlung === "erhoehen" ? aktuell + 1 : empfehlung === "senken" ? aktuell - 1 : aktuell;
  return { muster, aktuell, empfehlung, neu, grund, einheiten };
}

function pruefeMuster(
  muster: Muster,
  aktuell: number,
  befunde: EinheitBefund[],
): StufenCheckErgebnis {
  const anzahl = befunde.length;
  if (anzahl < STUFEN_CHECK_MIN_EINHEITEN) {
    return ergebnis(muster, aktuell, "halten", "zu_wenig_daten", anzahl);
  }

  const verfehlt = befunde.filter((b) => b.untergrenzeVerfehlt).length;
  const zuHart = befunde.filter((b) => b.zuHart).length;
  const problematisch = befunde.filter((b) => b.untergrenzeVerfehlt || b.zuHart).length;

  // Senken geht vor Erhöhen.
  if (problematisch >= STUFEN_CHECK_MIN_EINHEITEN) {
    if (aktuell <= STUFE_MIN) return ergebnis(muster, aktuell, "halten", "grenze", anzahl);
    const grund: StufenGrund = zuHart >= verfehlt ? "zu_hart" : "untergrenze_verfehlt";
    return ergebnis(muster, aktuell, "senken", grund, anzahl);
  }

  if (befunde.every((b) => b.zielErreicht)) {
    if (aktuell >= STUFE_MAX) return ergebnis(muster, aktuell, "halten", "grenze", anzahl);
    return ergebnis(muster, aktuell, "erhoehen", "ziel_erreicht", anzahl);
  }

  return ergebnis(muster, aktuell, "halten", "stabil", anzahl);
}

/**
 * Empfehlung je Muster aus den Einheiten der Wochen 5 und 6. Gibt immer acht Ergebnisse in der
 * Reihenfolge von MUSTER zurück. Einheiten anderer Wochen und Einheiten ohne verwertbaren
 * Messwert werden nicht gewertet.
 */
export const stufenCheck: StufenCheckFn = (e: StufenCheckEingabe): StufenCheckErgebnis[] => {
  const befundeJeMuster = new Map<Muster, EinheitBefund[]>();
  for (const einheit of e.einheiten) {
    if (!istGewerteteWoche(einheit.woche)) continue;
    const befund = bewerteEinheit(einheit);
    if (!befund) continue;
    const liste = befundeJeMuster.get(einheit.muster);
    if (liste) liste.push(befund);
    else befundeJeMuster.set(einheit.muster, [befund]);
  }
  return MUSTER.map((muster) =>
    pruefeMuster(muster, begrenzeStufe(e.stufen[muster]), befundeJeMuster.get(muster) ?? []),
  );
};
