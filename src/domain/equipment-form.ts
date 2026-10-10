// Equipment und Hantelgewichte eines Plans als Formular (Plan anlegen, Equipment später ändern).
import { formatGewichte, parseGewichte } from "./gewichte";
import type { Quelle } from "./quelle";
import { EQUIPMENT_AUSWAHL, type EquipmentArt, type Gewichte } from "./types";

/** Equipment-Arten, für die Hantelgewichte hinterlegt werden können. */
export const GEWICHT_ARTEN = ["kurzhanteln", "kettlebell"] as const;
export type GewichtArt = (typeof GEWICHT_ARTEN)[number];

/** Formularwerte: Gewichte bleiben als Text, damit Eingaben bei Fehlern erhalten bleiben. */
export interface EquipmentFormWerte {
  equipment: EquipmentArt[];
  gewichteText: Record<GewichtArt, string>;
}

export interface EquipmentDaten {
  equipment: EquipmentArt[];
  gewichte: Gewichte;
}

export type FormFehler = Record<string, string>;

/** Feldname der Gewichte einer Art im Formular */
export const gewichteFeld = (art: GewichtArt): string => `gewichte_${art}`;

/** Gültige Equipment-Arten in fester Reihenfolge, ohne Doppelte und Unbekanntes. */
export const bereinigeEquipment = (werte: readonly string[]): EquipmentArt[] =>
  EQUIPMENT_AUSWAHL.filter((art) => werte.includes(art));

/**
 * Liest die Häkchen (wiederholtes Feld oder Komma-Liste). `undefined`, wenn das Feld gar nicht
 * vorkommt (dann gelten die Voreinstellungen).
 */
export function liesEquipment(q: Quelle): EquipmentArt[] | undefined {
  const roh = q.alle ? q.alle("equipment") : [q("equipment") ?? ""].filter(Boolean);
  if (roh.length === 0) return undefined;
  // Mehrere Häkchen kommen als wiederholtes Feld; zusätzlich ist eine Komma-Liste erlaubt.
  return bereinigeEquipment(roh.flatMap((v) => v.split(",")).map((v) => v.trim()));
}

/** Gewichte-Texte, soweit im Formular vorhanden (sonst fehlt der Eintrag). */
export function liesGewichteText(q: Quelle): Partial<Record<GewichtArt, string>> {
  const text: Partial<Record<GewichtArt, string>> = {};
  for (const art of GEWICHT_ARTEN) {
    const v = q(gewichteFeld(art));
    if (v !== undefined) text[art] = v.trim();
  }
  return text;
}

/**
 * Prüft Equipment und Gewichte-Texte. Gewichte zählen nur für angekreuzte Arten; für alle anderen
 * wird der Text ignoriert.
 */
export function loeseEquipmentAuf(
  equipment: readonly EquipmentArt[],
  gewichteText: Record<GewichtArt, string>,
): { gewichte: Gewichte; fehler: FormFehler } {
  const gewichte: Gewichte = {};
  const fehler: FormFehler = {};
  for (const art of GEWICHT_ARTEN) {
    if (!equipment.includes(art)) continue;
    const r = parseGewichte(gewichteText[art]);
    if (!r.ok) fehler[gewichteFeld(art)] = r.grund;
    else if (r.werte.length > 0) gewichte[art] = r.werte;
  }
  return { gewichte, fehler };
}

export function parseEquipmentForm(q: Quelle): EquipmentFormWerte {
  const text = liesGewichteText(q);
  return {
    equipment: liesEquipment(q) ?? [],
    gewichteText: { kurzhanteln: text.kurzhanteln ?? "", kettlebell: text.kettlebell ?? "" },
  };
}

export type EquipmentValidierung =
  | { ok: true; daten: EquipmentDaten }
  | { ok: false; fehler: FormFehler };

export function validiereEquipment(werte: EquipmentFormWerte): EquipmentValidierung {
  const { gewichte, fehler } = loeseEquipmentAuf(werte.equipment, werte.gewichteText);
  if (Object.keys(fehler).length > 0) return { ok: false, fehler };
  return { ok: true, daten: { equipment: werte.equipment, gewichte } };
}

export function gewichteZuText(gewichte: Gewichte): Record<GewichtArt, string> {
  return {
    kurzhanteln: formatGewichte(gewichte.kurzhanteln ?? []),
    kettlebell: formatGewichte(gewichte.kettlebell ?? []),
  };
}

export function equipmentZuFormWerte(d: EquipmentDaten): EquipmentFormWerte {
  return { equipment: d.equipment, gewichteText: gewichteZuText(d.gewichte) };
}
