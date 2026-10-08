import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MUSTER } from "@/domain/types";
import { MUSTER_FARBE } from "./muster-farbe";

const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8");

describe("Musterfarben", () => {
  it("jedes Muster hat alle Klassen, und keine Klasse gehört zwei Mustern", () => {
    const alle = new Set<string>();
    for (const m of MUSTER) {
      const f = MUSTER_FARBE[m];
      for (const [k, v] of Object.entries(f)) {
        expect(v, `${m}.${k}`).toMatch(/\S/);
        expect(alle.has(v), `${m}.${k} doppelt: ${v}`).toBe(false);
        alle.add(v);
      }
    }
    expect(Object.keys(MUSTER_FARBE).sort()).toEqual([...MUSTER].sort());
  });

  it("die Klassen verweisen auf Tokens, die es in globals.css (hell und dunkel) gibt", () => {
    for (const m of MUSTER) {
      const k = m.toLowerCase();
      const klassen = Object.values(MUSTER_FARBE[m]).join(" ");
      expect(klassen).toContain(`m-${k}`);
      for (const token of [`--m-${k}:`, `--m-${k}-soft:`, `--m-${k}-ink:`]) {
        // einmal im :root (hell) und einmal im Dunkel-Block
        expect(css.split(token).length - 1, token).toBe(2);
      }
    }
  });
});
