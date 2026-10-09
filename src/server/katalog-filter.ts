import {
  parseRichtung,
  parseSortSpalte,
  type Richtung,
  type Spalte,
} from "@/domain/katalog-spalten";
import {
  BELASTUNGSARTEN,
  EQUIPMENT_AUSWAHL,
  MUSTER,
  PRUEFSTATI,
  type Belastungsart,
  type EquipmentArt,
  type Muster,
  type Pruefstatus,
} from "@/domain/types";

export type SearchParams = Record<string, string | string[] | undefined>;

export interface FilterAuswahl {
  muster?: Muster;
  stufe?: number;
  einseitig?: boolean;
  /** true = nur Ersatzübungen, false = nur Planübungen */
  ersatz?: boolean;
  /** Nur Übungen, die mit dem Equipment des aktiven Plans machbar sind */
  machbar?: boolean;
  /** Inaktive Übungen mit anzeigen (aktiv=alle oder das ältere inaktive=1) */
  inaktive: boolean;
  /** Nur inaktive Übungen (aktiv=inaktiv) */
  nurInaktive?: boolean;
  /** Nur Übungen mit Status "zu prüfen" (status=zu_pruefen oder das ältere offen=1) */
  nurZuPruefen: boolean;
  pruefstatus?: Pruefstatus;
  /** Suche in Name und ID */
  q?: string;
  /** Benötigt dieses Gerät  */
  geraet?: EquipmentArt;
  belastungsart?: Belastungsart;
  /** mit = nur Übungen mit Video, ohne = nur ohne */
  video?: boolean;
  /** Suche in den Hauptmuskeln */
  muskel?: string;
  sort?: Spalte;
  dir?: Richtung;
}

const erster = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

const MAX_SUCHE = 100;
const suche = (v: string | string[] | undefined): string | undefined => {
  const t = erster(v)?.trim().slice(0, MAX_SUCHE);
  return t ? t : undefined;
};
const aus = <T extends string>(
  liste: readonly T[],
  v: string | undefined,
): T | undefined => (liste.includes(v as T) ? (v as T) : undefined);

/** Liest die Filter aus der URL; unbekannte oder ungültige Werte werden ignoriert. */
export function parseKatalogFilter(sp: SearchParams): FilterAuswahl {
  const muster = erster(sp.muster);
  const stufe = Number(erster(sp.stufe));
  const einseitig = erster(sp.einseitig);
  const ersatz = erster(sp.ersatz);
  const aktiv = erster(sp.aktiv);
  const status = aus(PRUEFSTATI, erster(sp.status));
  const video = erster(sp.video);
  const filter: FilterAuswahl = {
    muster: (MUSTER as readonly string[]).includes(muster ?? "")
      ? (muster as Muster)
      : undefined,
    stufe:
      Number.isInteger(stufe) && stufe >= 1 && stufe <= 5 ? stufe : undefined,
    einseitig:
      einseitig === "ja" ? true : einseitig === "nein" ? false : undefined,
    ersatz: ersatz === "ja" ? true : ersatz === "nein" ? false : undefined,
    machbar: erster(sp.machbar) === "ja" ? true : undefined,
    inaktive: erster(sp.inaktive) === "1" || aktiv === "alle",
    nurInaktive: aktiv === "inaktiv" ? true : undefined,
    nurZuPruefen: erster(sp.offen) === "1" || status === "zu_pruefen",
    pruefstatus: status,
    q: suche(sp.q),
    geraet: aus(EQUIPMENT_AUSWAHL, erster(sp.geraet)),
    belastungsart: aus(BELASTUNGSARTEN, erster(sp.belastungsart)),
    video: video === "mit" ? true : video === "ohne" ? false : undefined,
    muskel: suche(sp.muskel),
    sort: parseSortSpalte(erster(sp.sort)),
    dir:
      erster(sp.dir) === undefined ? undefined : parseRichtung(erster(sp.dir)),
  };
  // "offen=1" meinte immer "zu prüfen": als Statusfilter behandeln, damit beide Wege gleich wirken.
  if (filter.nurZuPruefen && filter.pruefstatus === undefined)
    filter.pruefstatus = "zu_pruefen";
  return filter;
}

export function hatFilter(f: FilterAuswahl): boolean {
  return (
    f.muster !== undefined ||
    f.stufe !== undefined ||
    f.einseitig !== undefined ||
    f.ersatz !== undefined ||
    f.machbar !== undefined ||
    f.inaktive ||
    f.nurInaktive === true ||
    f.nurZuPruefen ||
    f.pruefstatus !== undefined ||
    f.q !== undefined ||
    f.geraet !== undefined ||
    f.belastungsart !== undefined ||
    f.video !== undefined ||
    f.muskel !== undefined
  );
}

/**
 * Die aktuellen Filter als URL-Parameter (für Links und Formulare, die sie behalten sollen).
 * Sortierung ist bewusst nicht enthalten: sie wird getrennt gesetzt.
 */
export function filterParameter(f: FilterAuswahl): URLSearchParams {
  const p = new URLSearchParams();
  if (f.muster) p.set("muster", f.muster);
  if (f.stufe !== undefined) p.set("stufe", String(f.stufe));
  if (f.einseitig !== undefined)
    p.set("einseitig", f.einseitig ? "ja" : "nein");
  if (f.ersatz !== undefined) p.set("ersatz", f.ersatz ? "ja" : "nein");
  if (f.machbar) p.set("machbar", "ja");
  if (f.nurInaktive) p.set("aktiv", "inaktiv");
  else if (f.inaktive) p.set("aktiv", "alle");
  if (f.pruefstatus) p.set("status", f.pruefstatus);
  if (f.q) p.set("q", f.q);
  if (f.geraet) p.set("geraet", f.geraet);
  if (f.belastungsart) p.set("belastungsart", f.belastungsart);
  if (f.video !== undefined) p.set("video", f.video ? "mit" : "ohne");
  if (f.muskel) p.set("muskel", f.muskel);
  return p;
}
