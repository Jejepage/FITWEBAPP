// Gemerkte Katalog-Ansicht (Karten/Tabelle) und Spalten im Cookie "fit_katalog".
import { cookies } from "next/headers";
import {
  parseAnsichtsCookie,
  type AnsichtsWahl,
} from "@/domain/katalog-spalten";

export const KATALOG_COOKIE = "fit_katalog";

export async function liesAnsichtsWahl(): Promise<AnsichtsWahl> {
  return parseAnsichtsCookie((await cookies()).get(KATALOG_COOKIE)?.value);
}
