import {
  GEWICHT_ARTEN,
  gewichteZuText,
  liesEquipment,
  liesGewichteText,
  loeseEquipmentAuf,
  type GewichtArt,
} from "./equipment-form";
import { SLOT_KEYS, type SlotKey } from "./plan-types";
import type { Quelle } from "./quelle";
import { MUSTER, type EquipmentArt, type Gewichte, type Muster } from "./types";

export { quelleAusFormData, quelleAusSearchParams, type Quelle } from "./quelle";

export const AKTIONEN = ["aktualisieren", "neu", "mischen"] as const;
export type Aktion = (typeof AKTIONEN)[number];

export const MAX_SEED = 999_999;

/** Rohwerte aus der Quelle; fehlende oder ungültige Angaben sind undefined. */
export interface PlanRohwerte {
  /** Das Formular wurde abgeschickt (unterscheidet "Haken fehlt" von "noch nie gesendet"). */
  gesendet: boolean;
  /** Angekreuztes Equipment; undefined, wenn das Feld fehlt (dann gilt die Voreinstellung) */
  equipment?: EquipmentArt[];
  /** Eingegebene Hantelgewichte als Text (nur, was im Formular vorkommt) */
  gewichteText: Partial<Record<GewichtArt, string>>;
  stufen: Partial<Record<Muster, number>>;
  einheitenProWoche?: 2 | 3;
  zusatzblock?: boolean;
  startDatum?: string;
  seed: number;
  vorgaengerId?: number;
  auswahl: Partial<Record<SlotKey, string>>;
  /** Fingerabdruck der Eingaben, aus denen die angezeigte Vorschau entstanden ist (siehe planBasis). */
  basis?: string;
  aktion: Aktion;
}

const ganzzahl = (v: string | undefined): number | undefined =>
  v !== undefined && /^\d{1,9}$/.test(v) ? Number(v) : undefined;

/** Echtes Kalenderdatum im Format JJJJ-MM-TT. */
export function istGueltigesDatum(text: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!m) return false;
  const [j, mo, t] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(j, mo - 1, t));
  return d.getUTCFullYear() === j && d.getUTCMonth() === mo - 1 && d.getUTCDate() === t;
}

export function parsePlanRohwerte(q: Quelle): PlanRohwerte {
  const stufen: Partial<Record<Muster, number>> = {};
  for (const m of MUSTER) {
    const s = ganzzahl(q(`stufe_${m}`));
    if (s !== undefined && s >= 1 && s <= 5) stufen[m] = s;
  }
  const einheiten = ganzzahl(q("einheiten"));
  const auswahl: Partial<Record<SlotKey, string>> = {};
  for (const key of SLOT_KEYS) {
    const v = q(`slot_${key}`);
    if (v && /^[A-Z]{2}-\d{2}$/.test(v)) auswahl[key] = v;
  }
  const aktion = AKTIONEN.find((a) => a === q("aktion")) ?? "aktualisieren";
  const seed = ganzzahl(q("seed"));
  const gesendet = q("gesendet") === "1";
  return {
    gesendet,
    // Ein abgeschicktes Formular ohne Haken heißt "kein Equipment", ein nie gesendetes nimmt den Standard.
    equipment: gesendet ? (liesEquipment(q) ?? []) : liesEquipment(q),
    gewichteText: liesGewichteText(q),
    stufen,
    einheitenProWoche: einheiten === 2 || einheiten === 3 ? einheiten : undefined,
    zusatzblock: q("zusatzblock") === undefined ? undefined : q("zusatzblock") === "1",
    startDatum: q("start"),
    seed: seed !== undefined && seed <= MAX_SEED ? seed : 0,
    vorgaengerId: ganzzahl(q("vorgaenger")),
    auswahl,
    basis: q("basis") || undefined,
    aktion,
  };
}

export interface PlanStandardwerte {
  equipment: EquipmentArt[];
  gewichte: Gewichte;
  stufen: Record<Muster, number>;
  einheitenProWoche: 2 | 3;
  zusatzblock: boolean;
  /** Heutiges Datum, JJJJ-MM-TT */
  heute: string;
}

export interface PlanWerte {
  equipment: EquipmentArt[];
  /** Geprüfte Hantelgewichte (nur für angekreuzte Arten, ohne fehlerhafte Eingaben) */
  gewichte: Gewichte;
  /** Gewichte als Text für das Formular: Eingabe des Nutzers, sonst die Voreinstellung */
  gewichteText: Record<GewichtArt, string>;
  stufen: Record<Muster, number>;
  einheitenProWoche: 2 | 3;
  zusatzblock: boolean;
  startDatum: string;
  seed: number;
  vorgaengerId: number | null;
  /** Manuelle Slot-Wahl; leer nach "neu" oder "mischen". */
  auswahl: Partial<Record<SlotKey, string>>;
}

/**
 * Fingerabdruck aller Eingaben, die die vorgeschlagene Belegung bestimmen. Ändert sich einer,
 * passen manuell gewählte Übungen nicht mehr zum neuen Vorschlag und werden verworfen; sonst
 * entstünden Mischpläne aus alter Wahl und neuem Vorschlag.
 */
export function planBasis(
  w: Pick<PlanWerte, "equipment" | "stufen" | "seed" | "vorgaengerId">,
): string {
  return [
    [...w.equipment].sort().join("+"),
    MUSTER.map((m) => w.stufen[m]).join(""),
    w.seed,
    w.vorgaengerId ?? 0,
  ].join("-");
}

export interface PlanAufloesung {
  werte: PlanWerte;
  /** Feldfehler, z. B. ein ungültiges Startdatum (dann gilt das Standarddatum). */
  fehler: Record<string, string>;
  /**
   * Equipment, Stufen, Seed oder Vorgänger wurden seit der letzten Vorschau geändert; die manuelle
   * Wahl wurde deshalb verworfen. Ein Speichern wäre dann nicht, was der Nutzer gesehen hat.
   */
  vorschauVeraltet: boolean;
}

/**
 * Ergänzt fehlende Angaben aus den Standardwerten und wendet die Aktion an:
 * "neu" verwirft die manuelle Wahl, "mischen" zusätzlich mit nächstem Seed.
 */
export function loesePlanWerteAuf(roh: PlanRohwerte, standard: PlanStandardwerte): PlanAufloesung {
  const fehler: Record<string, string> = {};
  const stufen = Object.fromEntries(
    MUSTER.map((m) => [m, roh.stufen[m] ?? standard.stufen[m]]),
  ) as Record<Muster, number>;

  let startDatum = standard.heute;
  if (roh.startDatum !== undefined && roh.startDatum !== "") {
    if (istGueltigesDatum(roh.startDatum)) startDatum = roh.startDatum;
    else fehler.startDatum = "Bitte ein gültiges Datum angeben.";
  }

  const equipment = roh.equipment ?? standard.equipment;
  const standardText = gewichteZuText(standard.gewichte);
  const gewichteText = Object.fromEntries(
    GEWICHT_ARTEN.map((art) => [art, roh.gewichteText[art] ?? standardText[art]]),
  ) as Record<GewichtArt, string>;
  const gewichtePruefung = loeseEquipmentAuf(equipment, gewichteText);
  Object.assign(fehler, gewichtePruefung.fehler);

  const werte: PlanWerte = {
    equipment,
    gewichte: gewichtePruefung.gewichte,
    gewichteText,
    stufen,
    einheitenProWoche: roh.einheitenProWoche ?? standard.einheitenProWoche,
    // Ein abgeschicktes Formular ohne Haken heißt "aus", ein nie gesendetes nimmt den Standard.
    zusatzblock: roh.zusatzblock ?? (roh.gesendet ? false : standard.zusatzblock),
    startDatum,
    // Mischen liefert nie 0 (0 heißt "nicht gemischt"): ... 999999 → 1
    seed: roh.aktion === "mischen" ? (roh.seed % MAX_SEED) + 1 : roh.seed,
    vorgaengerId: roh.vorgaengerId ?? null,
    auswahl: roh.auswahl,
  };
  // Manuelle Wahl gilt nur für genau die Eingaben, aus denen die Vorschau entstanden ist.
  const veraendert = roh.basis !== undefined && roh.basis !== planBasis(werte);
  if (roh.aktion === "neu" || roh.aktion === "mischen" || veraendert) werte.auswahl = {};
  return { werte, fehler, vorschauVeraltet: veraendert };
}
