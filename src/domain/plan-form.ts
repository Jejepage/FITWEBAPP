import { SLOT_KEYS, type SlotKey } from "./plan-types";
import { MUSTER, type Muster } from "./types";

/** Quelle für Formularwerte: URL-Parameter (Vorschau) oder FormData (Speichern). */
export type Quelle = (name: string) => string | undefined;

export const AKTIONEN = ["aktualisieren", "neu", "mischen"] as const;
export type Aktion = (typeof AKTIONEN)[number];

export const MAX_SEED = 999_999;

/** Rohwerte aus der Quelle; fehlende oder ungültige Angaben sind undefined. */
export interface PlanRohwerte {
  /** Das Formular wurde abgeschickt (unterscheidet "Haken fehlt" von "noch nie gesendet"). */
  gesendet: boolean;
  profilId?: number;
  stufen: Partial<Record<Muster, number>>;
  einheitenProWoche?: 2 | 3;
  zusatzblock?: boolean;
  startDatum?: string;
  seed: number;
  vorgaengerId?: number;
  auswahl: Partial<Record<SlotKey, string>>;
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
  return {
    gesendet: q("gesendet") === "1",
    profilId: ganzzahl(q("profil")),
    stufen,
    einheitenProWoche: einheiten === 2 || einheiten === 3 ? einheiten : undefined,
    zusatzblock: q("zusatzblock") === undefined ? undefined : q("zusatzblock") === "1",
    startDatum: q("start"),
    seed: seed !== undefined && seed <= MAX_SEED ? seed : 0,
    vorgaengerId: ganzzahl(q("vorgaenger")),
    auswahl,
    aktion,
  };
}

export interface PlanStandardwerte {
  profilId: number;
  stufen: Record<Muster, number>;
  einheitenProWoche: 2 | 3;
  zusatzblock: boolean;
  /** Heutiges Datum, JJJJ-MM-TT */
  heute: string;
}

export interface PlanWerte {
  profilId: number;
  stufen: Record<Muster, number>;
  einheitenProWoche: 2 | 3;
  zusatzblock: boolean;
  startDatum: string;
  seed: number;
  vorgaengerId: number | null;
  /** Manuelle Slot-Wahl; leer nach "neu" oder "mischen". */
  auswahl: Partial<Record<SlotKey, string>>;
}

export interface PlanAufloesung {
  werte: PlanWerte;
  /** Feldfehler, z. B. ein ungültiges Startdatum (dann gilt das Standarddatum). */
  fehler: Record<string, string>;
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

  const verwerfen = roh.aktion === "neu" || roh.aktion === "mischen";
  return {
    werte: {
      profilId: roh.profilId ?? standard.profilId,
      stufen,
      einheitenProWoche: roh.einheitenProWoche ?? standard.einheitenProWoche,
      // Ein abgeschicktes Formular ohne Haken heißt "aus", ein nie gesendetes nimmt den Standard.
      zusatzblock: roh.zusatzblock ?? (roh.gesendet ? false : standard.zusatzblock),
      startDatum,
      seed: roh.aktion === "mischen" ? (roh.seed + 1) % (MAX_SEED + 1) : roh.seed,
      vorgaengerId: roh.vorgaengerId ?? null,
      auswahl: verwerfen ? {} : roh.auswahl,
    },
    fehler,
  };
}

export const quelleAusSearchParams =
  (sp: Record<string, string | string[] | undefined>): Quelle =>
  (name) => {
    const v = sp[name];
    return Array.isArray(v) ? v[0] : v;
  };

export const quelleAusFormData =
  (fd: FormData): Quelle =>
  (name) => {
    const v = fd.get(name);
    return typeof v === "string" ? v : undefined;
  };
