"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  parseAnsicht,
  parseAnsichtsCookie,
  parseRichtung,
  parseSortSpalte,
  parseSpalten,
  serialisiereAnsichtsCookie,
} from "@/domain/katalog-spalten";
import { filterParameter, parseKatalogFilter } from "@/server/katalog-filter";
import { KATALOG_COOKIE } from "@/server/katalog-ansicht";

const text = (v: FormDataEntryValue | null): string =>
  typeof v === "string" ? v : "";

/**
 * Merkt die Ansicht (Karten/Tabelle) oder die Spalten im Cookie und kehrt mit den aktuellen
 * Filtern zum Katalog zurück. Die Rückkehradresse wird aus bekannten Filtern neu aufgebaut,
 * nie aus Formularwerten übernommen.
 */
export async function speichereAnsicht(fd: FormData): Promise<void> {
  const speicher = await cookies();
  const bisher = parseAnsichtsCookie(speicher.get(KATALOG_COOKIE)?.value);
  const was = text(fd.get("was"));
  const neu = {
    ansicht:
      was === "ansicht"
        ? parseAnsicht(text(fd.get("ansicht")))
        : bisher.ansicht,
    spalten:
      was === "spalten"
        ? parseSpalten(
            fd
              .getAll("spalte")
              .filter((s): s is string => typeof s === "string")
              .join(","),
          )
        : bisher.spalten,
  };
  const h = await headers();
  speicher.set(KATALOG_COOKIE, serialisiereAnsichtsCookie(neu), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 86400,
    secure: h.get("x-forwarded-proto") === "https",
  });

  const rueck = new URLSearchParams(text(fd.get("zurueck")));
  const filter = parseKatalogFilter(Object.fromEntries(rueck));
  const ziel = filterParameter(filter);
  const sort = parseSortSpalte(rueck.get("sort") ?? undefined);
  if (sort) {
    ziel.set("sort", sort);
    ziel.set("dir", parseRichtung(rueck.get("dir")));
  }
  const query = ziel.toString();
  redirect(query ? `/katalog?${query}` : "/katalog");
}
