/**
 * Hantelgewichte in kg als Text. Erlaubt sind:
 * - Listen, getrennt durch Leerzeichen, Zeilenumbruch, Semikolon oder Komma mit Leerzeichen: "12, 16"
 * - Dezimalzahlen mit Komma oder Punkt: "2,5" (Komma ohne Leerzeichen ist ein Dezimalkomma; weil
 *   reale Gewichte in Vielfachen von 0,25 kg vorkommen, wird "12,16" als Tippfehler abgewiesen)
 * - Bereiche "von–bis/Schritt": "2–20/2" = 2, 4, …, 20
 */
export const MAX_GEWICHT_KG = 500;
export const MAX_ANZAHL_GEWICHTE = 100;

export type GewichteErgebnis = { ok: true; werte: number[] } | { ok: false; grund: string };

const ZAHL = String.raw`\d+(?:\.\d+)?`;
const EINZEL_RE = new RegExp(`^(${ZAHL})$`);
const BEREICH_RE = new RegExp(`^(${ZAHL})[–-](${ZAHL})/(${ZAHL})$`);

const runde = (n: number) => Math.round(n * 1000) / 1000;

export function parseGewichte(text: string): GewichteErgebnis {
  const tokens = text
    .replace(/,(?=\s|$)/g, " ") // Komma + Leerzeichen (oder am Ende) trennt Werte
    .split(/[;\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const werte = new Set<number>();
  for (const roh of tokens) {
    const token = roh.replace(/,/g, ".");
    const einzel = EINZEL_RE.exec(token);
    if (einzel) {
      const wert = Number(einzel[1]);
      if (roh.includes(",") && !Number.isInteger(wert * 4)) {
        return {
          ok: false,
          grund: `„${roh}“ ist unklar. Mehrere Gewichte trennst du mit Semikolon oder Komma plus Leerzeichen („12, 16“). Ein Dezimalkomma geht nur bei Vielfachen von 0,25 kg („2,5“).`,
        };
      }
      werte.add(runde(wert));
      continue;
    }
    const bereich = BEREICH_RE.exec(token);
    if (!bereich) return { ok: false, grund: `„${roh}“ ist keine gültige Angabe.` };
    const [von, bis, schritt] = [Number(bereich[1]), Number(bereich[2]), Number(bereich[3])];
    if (schritt <= 0) return { ok: false, grund: "Die Schrittweite muss größer als 0 sein." };
    if (von > bis)
      return { ok: false, grund: `Im Bereich „${roh}“ ist der Anfang größer als das Ende.` };
    if ((bis - von) / schritt > MAX_ANZAHL_GEWICHTE) {
      return { ok: false, grund: `Der Bereich „${roh}“ enthält zu viele Werte.` };
    }
    for (let i = 0; von + i * schritt <= bis + 1e-9; i++) werte.add(runde(von + i * schritt));
  }

  const liste = [...werte].sort((a, b) => a - b);
  if (liste.some((w) => w <= 0 || w > MAX_GEWICHT_KG)) {
    return { ok: false, grund: `Gewichte müssen zwischen 0 und ${MAX_GEWICHT_KG} kg liegen.` };
  }
  if (liste.length > MAX_ANZAHL_GEWICHTE) {
    return { ok: false, grund: `Höchstens ${MAX_ANZAHL_GEWICHTE} verschiedene Gewichte.` };
  }
  return { ok: true, werte: liste };
}

const zahl = (n: number) => String(n).replace(".", ",");

/** Kompakte Schreibweise: gleichmäßige Folgen ab 4 Werten werden zu "von–bis/Schritt". */
export function formatGewichte(werte: readonly number[]): string {
  const w = [...werte].sort((a, b) => a - b);
  const teile: string[] = [];
  let i = 0;
  while (i < w.length) {
    let j = i + 1;
    if (j < w.length) {
      const schritt = runde(w[j]! - w[i]!);
      while (j + 1 < w.length && runde(w[j + 1]! - w[j]!) === schritt) j++;
      if (j - i + 1 >= 4) {
        teile.push(`${zahl(w[i]!)}–${zahl(w[j]!)}/${zahl(schritt)}`);
        i = j + 1;
        continue;
      }
    }
    teile.push(zahl(w[i]!));
    i++;
  }
  return teile.join(", ");
}
