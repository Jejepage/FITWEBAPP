import { describe, expect, it } from "vitest";
import { STANDARD_BEREICH_RE, equipmentBedingungSchema } from "./schemas";

describe("standardBereich", () => {
  it.each(["8–12", "8-12", "20–40 s", "20–40 m", "3–5"])("akzeptiert %s", (v) => {
    expect(STANDARD_BEREICH_RE.test(v)).toBe(true);
  });
  it.each(["", "8", "acht–zwölf", "20–40 sek", "8–12 Wdh"])("verwirft %s", (v) => {
    expect(STANDARD_BEREICH_RE.test(v)).toBe(false);
  });
});

describe("equipmentBedingung", () => {
  it("akzeptiert Gruppenlisten und die leere Liste", () => {
    expect(equipmentBedingungSchema.safeParse([]).success).toBe(true);
    expect(equipmentBedingungSchema.safeParse([["kurzhanteln", "kettlebell"]]).success).toBe(true);
    expect(equipmentBedingungSchema.safeParse([["kurzhanteln"], ["bank"]]).success).toBe(true);
  });
  it("verwirft unbekannte Arten und leere Gruppen", () => {
    expect(equipmentBedingungSchema.safeParse([["hantelbank"]]).success).toBe(false);
    expect(equipmentBedingungSchema.safeParse([[]]).success).toBe(false);
  });
});
