import { z } from "zod";
import { MUSTER, type Muster } from "./types";

export const MAX_AUFWAERMEN_ZEICHEN = 1000;

export interface SettingsFormWerte {
  stufen: Record<Muster, number>;
  einheitenProWoche: number;
  zusatzblock: boolean;
  aufwaermenText: string;
}

export type FormFehler = Record<string, string>;

const schema = z.object({
  stufen: z.record(z.enum(MUSTER), z.number().int().min(1).max(5)),
  einheitenProWoche: z.union([z.literal(2), z.literal(3)]),
  zusatzblock: z.boolean(),
  aufwaermenText: z.string().min(1).max(MAX_AUFWAERMEN_ZEICHEN),
});

export function parseSettingsForm(fd: FormData): SettingsFormWerte {
  const stufen = Object.fromEntries(
    MUSTER.map((m) => {
      const roh = fd.get(`stufe_${m}`);
      return [m, typeof roh === "string" && roh.trim() !== "" ? Number(roh) : Number.NaN];
    }),
  ) as Record<Muster, number>;
  const einheiten = fd.get("einheitenProWoche");
  const aufwaermen = fd.get("aufwaermenText");
  return {
    stufen,
    einheitenProWoche: typeof einheiten === "string" ? Number(einheiten) : Number.NaN,
    zusatzblock: fd.get("zusatzblock") === "on",
    aufwaermenText: typeof aufwaermen === "string" ? aufwaermen.replace(/\r\n/g, "\n").trim() : "",
  };
}

export type SettingsValidierung =
  | { ok: true; werte: SettingsFormWerte }
  | { ok: false; fehler: FormFehler };

export function validiereSettings(werte: SettingsFormWerte): SettingsValidierung {
  const r = schema.safeParse(werte);
  if (r.success) return { ok: true, werte: r.data as SettingsFormWerte };
  const fehler: FormFehler = {};
  for (const issue of r.error.issues) {
    const [feld, muster] = issue.path;
    if (feld === "stufen" && typeof muster === "string")
      fehler[`stufe_${muster}`] = "Stufe zwischen 1 und 5.";
    else if (feld === "stufen") fehler.stufen = "Bitte für jedes Muster eine Stufe wählen.";
    else if (feld === "einheitenProWoche")
      fehler.einheitenProWoche = "Bitte 2 oder 3 Einheiten pro Woche wählen.";
    else if (feld === "aufwaermenText") {
      fehler.aufwaermenText =
        werte.aufwaermenText === ""
          ? "Bitte einen Aufwärmtext angeben."
          : `Höchstens ${MAX_AUFWAERMEN_ZEICHEN} Zeichen.`;
    } else fehler[String(feld)] = "Ungültige Eingabe.";
  }
  return { ok: false, fehler };
}
