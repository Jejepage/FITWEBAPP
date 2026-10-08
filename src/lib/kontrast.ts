// Kontrastberechnung nach WCAG 2.x (für den Token-Test und die Browserprüfung).
export type Rgb = readonly [number, number, number];

export function hexZuRgb(hex: string): Rgb {
  const h = hex.trim().replace(/^#/, "");
  const voll = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  if (!/^[0-9a-f]{6}$/i.test(voll)) throw new Error(`Keine Hex-Farbe: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(voll.slice(i, i + 2), 16)) as unknown as Rgb;
}

export function luminanz([r, g, b]: Rgb): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function kontrast(a: Rgb, b: Rgb): number {
  const x = luminanz(a);
  const y = luminanz(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Liest `--name: #rrggbb;` aus einem CSS-Block; Hex-Werte only. */
export function liesTokens(css: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/g)) if (m[1] && m[2]) out[m[1]] = m[2];
  return out;
}
