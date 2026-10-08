import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MUSTER } from "@/domain/types";
import { hexZuRgb, kontrast, liesTokens } from "./kontrast";

const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8");
const dunkelStart = css.indexOf("prefers-color-scheme: dark");
const themeStart = css.indexOf("@theme inline");
const hell = liesTokens(css.slice(0, dunkelStart));
const dunkel = { ...hell, ...liesTokens(css.slice(dunkelStart, themeStart)) };

const paare = (t: Record<string, string>): [string, string, string, number][] => {
  const p: [string, string, string, number][] = [];
  const add = (text: string, grund: string, min = 4.5) => p.push([text, grund, "", min]);
  for (const grund of ["bg", "surface", "fill"]) {
    add("ink", grund);
    add("ink-2", grund);
    add("ink-3", grund);
    add("accent-ink", grund);
    for (const s of ["ok", "warn", "bad"]) add(`${s}-ink`, grund);
  }
  add("on-accent", "accent");
  add("on-accent", "hero-from");
  add("on-accent", "hero-to");
  add("accent-ink", "accent-soft");
  add("ink", "accent-soft");
  for (const s of ["ok", "warn", "bad"]) {
    add(`${s}-ink`, `${s}-soft`);
    add("ink", `${s}-soft`);
  }
  for (const m of MUSTER) {
    const k = m.toLowerCase();
    add(`m-${k}-ink`, "surface");
    add(`m-${k}-ink`, "bg");
    add(`m-${k}-ink`, `m-${k}-soft`);
    add("ink", `m-${k}-soft`);
    add("ink-2", `m-${k}-soft`);
  }
  for (let i = 1; i <= 9; i++) add("on-rpe", `rpe-${i}`);
  add("on-rpe-hi", "rpe-10");
  void t;
  return p;
};

describe.each([
  ["hell", hell],
  ["dunkel", dunkel],
] as const)("Kontrast (%s)", (_name, t) => {
  it("alle Tokens der Paare sind definiert", () => {
    for (const [a, b] of paare(t)) {
      expect(t[a], a).toBeDefined();
      expect(t[b], b).toBeDefined();
    }
  });

  it("Text-/Flächenpaare erreichen WCAG AA (4,5:1)", () => {
    const zuNiedrig = paare(t)
      .map(([a, b, , min]) => ({
        a,
        b,
        min,
        v: kontrast(hexZuRgb(t[a] ?? ""), hexZuRgb(t[b] ?? "")),
      }))
      .filter((x) => x.v < x.min)
      .map((x) => `${x.a} auf ${x.b}: ${x.v.toFixed(2)} < ${x.min}`);
    expect(zuNiedrig).toEqual([]);
  });
});

describe("Aufbau der Tokens", () => {
  it("der Dunkelmodus überschreibt nur vorhandene Tokens", () => {
    for (const k of Object.keys(liesTokens(css.slice(dunkelStart, themeStart)))) {
      expect(hell[k], `${k} fehlt im Hell-Block`).toBeDefined();
    }
  });
  it("Dunkel nutzt echtes Schwarz als Grund", () => {
    expect(dunkel.bg).toBe("#000000");
  });
});
