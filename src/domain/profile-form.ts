import { formatGewichte, parseGewichte } from "./gewichte";
import { EQUIPMENT_AUSWAHL, type EquipmentArt, type Gewichte } from "./types";

/** Equipment-Arten, für die Hantelgewichte hinterlegt werden können. */
export const GEWICHT_ARTEN = ["kurzhanteln", "kettlebell"] as const;
export type GewichtArt = (typeof GEWICHT_ARTEN)[number];

export const MAX_NAME_LAENGE = 40;

/** Formularwerte: Gewichte bleiben als Text, damit Eingaben bei Fehlern erhalten bleiben. */
export interface ProfilFormWerte {
  name: string;
  equipment: EquipmentArt[];
  gewichteText: Record<GewichtArt, string>;
  istStandard: boolean;
}

export interface ProfilDaten {
  name: string;
  equipment: EquipmentArt[];
  gewichte: Gewichte;
  istStandard: boolean;
}

export type FormFehler = Record<string, string>;

const text = (v: FormDataEntryValue | null): string => (typeof v === "string" ? v.trim() : "");

export function parseProfilForm(fd: FormData): ProfilFormWerte {
  const gewaehlt = fd.getAll("equipment").filter((v): v is string => typeof v === "string");
  return {
    name: text(fd.get("name")),
    equipment: EQUIPMENT_AUSWAHL.filter((art) => gewaehlt.includes(art)),
    gewichteText: {
      kurzhanteln: text(fd.get("gewichte_kurzhanteln")),
      kettlebell: text(fd.get("gewichte_kettlebell")),
    },
    istStandard: fd.get("istStandard") === "on",
  };
}

export type ProfilValidierung =
  | { ok: true; profil: ProfilDaten }
  | { ok: false; fehler: FormFehler };

export function validiereProfil(werte: ProfilFormWerte): ProfilValidierung {
  const fehler: FormFehler = {};
  if (werte.name === "") fehler.name = "Bitte einen Namen angeben.";
  else if (werte.name.length > MAX_NAME_LAENGE) {
    fehler.name = `Der Name darf höchstens ${MAX_NAME_LAENGE} Zeichen lang sein.`;
  }

  const gewichte: Gewichte = {};
  for (const art of GEWICHT_ARTEN) {
    // Gewichte zählen nur für angekreuzte Arten; für alle anderen wird der Text ignoriert.
    if (!werte.equipment.includes(art)) continue;
    const r = parseGewichte(werte.gewichteText[art]);
    if (!r.ok) fehler[`gewichte_${art}`] = r.grund;
    else if (r.werte.length > 0) gewichte[art] = r.werte;
  }

  if (Object.keys(fehler).length > 0) return { ok: false, fehler };
  return {
    ok: true,
    profil: {
      name: werte.name,
      equipment: werte.equipment,
      gewichte,
      istStandard: werte.istStandard,
    },
  };
}

export function profilZuFormWerte(p: ProfilDaten): ProfilFormWerte {
  return {
    name: p.name,
    equipment: p.equipment,
    gewichteText: {
      kurzhanteln: formatGewichte(p.gewichte.kurzhanteln ?? []),
      kettlebell: formatGewichte(p.gewichte.kettlebell ?? []),
    },
    istStandard: p.istStandard,
  };
}

export function leereProfilFormWerte(): ProfilFormWerte {
  return {
    name: "",
    equipment: [],
    gewichteText: { kurzhanteln: "", kettlebell: "" },
    istStandard: false,
  };
}
