// Doppelprogression (Spec 2.5): Vorschlag für die nächste Einheit einer Übung. Rein.
import { WOCHEN_PRO_BLOCK } from "./training-types";
import { zielBereich } from "./weeks";
import type {
  GewichtsArt,
  SatzWerte,
  Vorschlag,
  VorschlagEingabe,
  VorschlagGrund,
} from "./training-types";
import type { Gewichte } from "./types";

const SCHRITT_MASCHINE = 2.5;
const SCHRITT_ALLTAGSLAST = 1;
const SCHRITT_MESSWERT = 5;
/** Bis "Gut" (gespeichert 8) darf gesteigert werden; "Schwer" (9) und "Am Limit" (10) verhindern es. */
const RPE_GRENZE_OBEN = 8;
const RPE_ZU_HART = 9;

type Art = GewichtsArt | "gewicht-alltag";

function runde2(x: number): number {
  return Math.round(x * 100) / 100;
}

function clamp(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, x));
}

/** Nächste Gewichtsstufe oberhalb von `aktuell`; `null`, wenn die Hantelliste erschöpft ist. */
export function naechstesGewicht(
  aktuell: number,
  art: GewichtsArt,
  gewichte: readonly number[] | undefined,
): number | null {
  if (art === "gewicht-maschine") return runde2(aktuell + SCHRITT_MASCHINE);
  if (!gewichte || gewichte.length === 0) return runde2(aktuell + SCHRITT_MASCHINE);
  let best: number | null = null;
  for (const g of gewichte) {
    if (g > aktuell && (best === null || g < best)) best = g;
  }
  return best === null ? null : runde2(best);
}

function artDerSteigerung(u: VorschlagEingabe["uebung"]): Art {
  const arten = new Set<string>([...u.equipment.flat(), ...u.optionaleLast]);
  if (arten.has("kurzhanteln") || arten.has("kettlebell")) return "gewicht-hantel";
  if (arten.has("maschinen") || arten.has("langhantel")) return "gewicht-maschine";
  return "gewicht-alltag";
}

/** Vereinigte Stufenliste der Hantelarten, die die Übung nutzt (aufsteigend, ohne Doppelte). */
function hantelListe(u: VorschlagEingabe["uebung"], gewichte: Gewichte): number[] {
  const arten = new Set<string>([...u.equipment.flat(), ...u.optionaleLast]);
  const alle: number[] = [];
  if (arten.has("kurzhanteln")) alle.push(...(gewichte.kurzhanteln ?? []));
  if (arten.has("kettlebell")) alle.push(...(gewichte.kettlebell ?? []));
  return [...new Set(alle)].sort((a, b) => a - b);
}

function schrittFuer(art: Art, kannGewicht: boolean, liste: readonly number[]): number {
  if (!kannGewicht) return 0;
  if (art === "gewicht-alltag") return SCHRITT_ALLTAGSLAST;
  if (art === "gewicht-hantel" && liste.length >= 2) {
    let klein = Infinity;
    for (let i = 1; i < liste.length; i++) {
      const d = (liste[i] as number) - (liste[i - 1] as number);
      if (d > 0 && d < klein) klein = d;
    }
    if (Number.isFinite(klein)) return runde2(klein);
  }
  return SCHRITT_MASCHINE;
}

/** Nächstes Gewicht; bei `ref === null` das erste Gewicht der Übung. */
function naechsteStufeGewicht(
  ref: number | null,
  art: Art,
  liste: readonly number[],
): number | null {
  const aktuell = ref ?? 0;
  if (art === "gewicht-alltag") return runde2(aktuell + SCHRITT_ALLTAGSLAST);
  return naechstesGewicht(aktuell, art, liste);
}

export function vorschlagFuerUebung(e: VorschlagEingabe): Vorschlag {
  const { uebung, woche, gewichte } = e;
  const ziel = zielBereich(uebung, woche);
  const art = uebung.belastungsart;
  const messwert = (s: SatzWerte): number | null =>
    art === "wdh" ? s.wdh : art === "zeit" ? s.sekunden : s.meter;

  const kannGewicht = uebung.steigerungsart.includes("gewicht");
  const gewichtsArt = artDerSteigerung(uebung);
  const liste = gewichtsArt === "gewicht-hantel" ? hantelListe(uebung, gewichte) : [];
  const schritt = schrittFuer(gewichtsArt, kannGewicht, liste);

  const bauen = (
    grund: VorschlagGrund,
    gewicht: number | null,
    wert: number,
    tempo: boolean,
  ): Vorschlag => ({
    gewicht,
    wdh: art === "wdh" ? wert : null,
    sekunden: art === "zeit" ? wert : null,
    meter: art === "strecke" ? wert : null,
    tempo,
    grund,
    schritt,
  });

  const verwertbar = e.letzteSaetze.filter((s) => messwert(s) !== null);
  if (verwertbar.length === 0) return bauen("start", null, ziel.min, false);

  // Bezugsgewicht ist das höchste verwendete Gewicht (Arbeitsgewicht). Ein leichterer Aufwärm-
  // oder Abbau-Satz soll den Vorschlag nicht nach unten ziehen. Nur Sätze mit diesem Gewicht zählen.
  const genutzt = verwertbar.flatMap((s) => (s.gewicht === null ? [] : [s.gewicht]));
  const ref = genutzt.length > 0 ? Math.max(...genutzt) : null;
  const saetze = verwertbar.filter((s) => s.gewicht === ref);
  const werte = saetze.map((s) => messwert(s) as number);
  const niedrigste = Math.min(...werte);
  const alleTempo = saetze.every((s) => s.tempo);
  // Tempo-Stufe gibt es nur bei Wiederholungsübungen.
  const tempoSchonGenutzt = saetze.some((s) => s.tempo);
  const mitTempo = art === "wdh" && alleTempo;

  const obenErreicht = saetze.every(
    (s) => (messwert(s) as number) >= ziel.max && (s.rpe === null || s.rpe <= RPE_GRENZE_OBEN),
  );

  // Woche 6 ist Entlastung und Test: keine Steigerung, gleiche Last und gleiches Ziel wie zuletzt.
  if (woche >= WOCHEN_PRO_BLOCK) {
    return bauen("wiederholen", ref, clamp(niedrigste, ziel.min, ziel.max), mitTempo);
  }

  if (obenErreicht) {
    if (kannGewicht) {
      const neu = naechsteStufeGewicht(ref, gewichtsArt, liste);
      if (neu !== null) return bauen("mehr_gewicht", neu, ziel.min, false);
    }
    // Ersatzübungen steigern nur über Wiederholungen (und Gewicht): Tempo und nächste Stufe wählt
    // man dort selbst.
    if (!uebung.ersatz) {
      if (art === "wdh" && uebung.steigerungsart.includes("tempo") && !tempoSchonGenutzt) {
        return bauen("tempo", ref, ziel.max, true);
      }
      if (uebung.steigerungsart.includes("stufe") && uebung.schwererId) {
        return bauen("naechste_stufe", ref, ziel.max, mitTempo);
      }
    }
    return bauen("wiederholen", ref, ziel.max, mitTempo);
  }

  const zuHart = saetze.some((s) => s.rpe !== null && s.rpe >= RPE_ZU_HART);
  const zuwachs = art === "wdh" ? 1 : SCHRITT_MESSWERT;
  const mehrGrund: VorschlagGrund =
    art === "wdh" ? "mehr_wdh" : art === "zeit" ? "mehr_zeit" : "mehr_strecke";
  const wunsch = zuHart ? niedrigste : niedrigste + zuwachs;
  // Zu harte Einheit: nie über das hinaus, was zuletzt geschafft wurde (nur nach oben begrenzen).
  const zielWert = zuHart ? Math.min(niedrigste, ziel.max) : clamp(wunsch, ziel.min, ziel.max);
  const grund = !zuHart && zielWert > niedrigste ? mehrGrund : "wiederholen";
  return bauen(grund, ref, zielWert, mitTempo);
}
