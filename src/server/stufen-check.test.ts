import { beforeEach, describe, expect, it } from "vitest";
import { neueSeedDb } from "@/db/test-utils";
import type { Db } from "@/db/types";
import { getPlan } from "./plans";
import { istBlockFertig, ladeStufenCheck } from "./stufen-check";
import { legeBlockAn, type TestSatzKontext } from "./test-helfer";

let db: Db;
beforeEach(() => {
  db = neueSeedDb();
});

/** KN: weit über der Obergrenze bei RPE 6 (erhöhen), HB: unter der Untergrenze bei RPE 9 (senken). */
const satz = (k: TestSatzKontext) => {
  if (k.muster === "KN") return { gewicht: 10, wdh: 40, rpe: 6 };
  if (k.muster === "HB") return { gewicht: 10, wdh: 1, rpe: 9 };
  return { gewicht: 10, wdh: 10, rpe: 7 };
};
const ergebnis = (erg: ReturnType<typeof ladeStufenCheck>, muster: string) =>
  erg.find((e) => e.muster === muster)!;

describe("ladeStufenCheck", () => {
  it("empfiehlt je Muster aus den Sätzen der Woche 5 und 6", () => {
    const { planId } = legeBlockAn(db, { einheiten: 12, satz });
    const erg = ladeStufenCheck(db, getPlan(db, planId)!);
    expect(erg).toHaveLength(8);
    expect(ergebnis(erg, "KN")).toMatchObject({
      aktuell: 2,
      empfehlung: "erhoehen",
      neu: 3,
      grund: "ziel_erreicht",
      einheiten: 4,
    });
    expect(ergebnis(erg, "HB")).toMatchObject({ empfehlung: "senken", neu: 1 });
  });

  it("Ad-hoc-Einheiten zählen nicht", () => {
    const { planId } = legeBlockAn(db, { einheiten: 12, satz, adHoc: (n) => n >= 8 });
    const erg = ladeStufenCheck(db, getPlan(db, planId)!);
    expect(ergebnis(erg, "KN")).toMatchObject({
      empfehlung: "halten",
      grund: "zu_wenig_daten",
      einheiten: 0,
    });
  });

  it("Wochen 1 bis 4 fließen nicht ein", () => {
    const { planId } = legeBlockAn(db, { einheiten: 8, satz });
    const erg = ladeStufenCheck(db, getPlan(db, planId)!);
    expect(ergebnis(erg, "KN").grund).toBe("zu_wenig_daten");
  });

  it("ohne Einheiten: acht Mal halten", () => {
    const { planId } = legeBlockAn(db, { einheiten: 0 });
    const erg = ladeStufenCheck(db, getPlan(db, planId)!);
    expect(erg.every((e) => e.empfehlung === "halten")).toBe(true);
  });
});

describe("istBlockFertig", () => {
  it("erst nach 6 × Einheiten pro Woche", () => {
    const a = legeBlockAn(db, { einheiten: 11 });
    expect(istBlockFertig(db, getPlan(db, a.planId)!)).toBe(false);
  });

  it("12 Einheiten bei 2× sind ein fertiger Block", () => {
    const a = legeBlockAn(db, { einheiten: 12 });
    expect(istBlockFertig(db, getPlan(db, a.planId)!)).toBe(true);
  });

  it("3×/Woche braucht 18", () => {
    const a = legeBlockAn(db, { einheiten: 12, einheitenProWoche: 3 });
    expect(istBlockFertig(db, getPlan(db, a.planId)!)).toBe(false);
  });
});
