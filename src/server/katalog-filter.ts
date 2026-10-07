import { MUSTER, type Muster } from "@/domain/types";

export type SearchParams = Record<string, string | string[] | undefined>;

export interface FilterAuswahl {
  muster?: Muster;
  stufe?: number;
  einseitig?: boolean;
  profilId?: number;
  inaktive: boolean;
  nurZuPruefen: boolean;
}

const erster = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

/** Liest die Filter aus der URL; unbekannte oder ungültige Werte werden ignoriert. */
export function parseKatalogFilter(sp: SearchParams): FilterAuswahl {
  const muster = erster(sp.muster);
  const stufe = Number(erster(sp.stufe));
  const einseitig = erster(sp.einseitig);
  const profil = Number(erster(sp.profil));
  return {
    muster: (MUSTER as readonly string[]).includes(muster ?? "") ? (muster as Muster) : undefined,
    stufe: Number.isInteger(stufe) && stufe >= 1 && stufe <= 5 ? stufe : undefined,
    einseitig: einseitig === "ja" ? true : einseitig === "nein" ? false : undefined,
    profilId: Number.isInteger(profil) && profil > 0 ? profil : undefined,
    inaktive: erster(sp.inaktive) === "1",
    nurZuPruefen: erster(sp.offen) === "1",
  };
}

export function hatFilter(f: FilterAuswahl): boolean {
  return (
    f.muster !== undefined ||
    f.stufe !== undefined ||
    f.einseitig !== undefined ||
    f.profilId !== undefined ||
    f.inaktive ||
    f.nurZuPruefen
  );
}
