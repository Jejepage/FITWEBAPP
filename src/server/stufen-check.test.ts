import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { setLog } from "@/db/schema";
import { neueSeedDb } from "@/db/test-utils";
import type { Db } from "@/db/types";
import { alleUebungen } from "./exercises";
import { getPlan, getPlanSlotsMitId } from "./plans";
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

  it("Sätze einer anderen Übung als der geplanten (Ersatz) zählen nicht", () => {
    const { planId } = legeBlockAn(db, { einheiten: 12, satz });
    const katalog = alleUebungen(db);
    for (const slot of getPlanSlotsMitId(db, planId)) {
      const ersatz = katalog.find((u) => u.muster === slot.muster && u.id !== slot.exerciseId)!;
      db.update(setLog).set({ exerciseId: ersatz.id }).where(eq(setLog.planSlotId, slot.id)).run();
    }
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

describe("Übungswechsel innerhalb einer Einheit", () => {
  it("zählt dieselbe Einheit eines Musters nur einmal (kein Senken durch einen einzigen Tag)", () => {
    const { planId, workoutIds } = legeBlockAn(db, { einheiten: 12 });
    // Einheit in Woche 5 (A): Kniebeuge hart und mit Übungswechsel in Runde 3
    const alle = getPlanSlotsMitId(db, planId);
    const slot = alle.find((s) => s.einheit === "A" && s.muster === "KN")!;
    const ersatz = alleUebungen(db).find(
      (u) => u.muster === "KN" && !alle.some((s) => s.exerciseId === u.id),
    )!;
    db.update(setLog)
      .set({ wdh: 1, rpe: 9 })
      .where(and(eq(setLog.workoutId, workoutIds[8]!), eq(setLog.planSlotId, slot.id)))
      .run();
    db.update(setLog)
      .set({ exerciseId: ersatz.id })
      .where(
        and(
          eq(setLog.workoutId, workoutIds[8]!),
          eq(setLog.planSlotId, slot.id),
          eq(setLog.runde, 3),
        ),
      )
      .run();
    const erg = ladeStufenCheck(db, getPlan(db, planId)!);
    const kn = erg.find((e) => e.muster === "KN")!;
    expect(kn.einheiten).toBe(4);
    expect(kn.empfehlung).not.toBe("senken");
  });
});

describe("Ersatzübungen", () => {
  it("fließen nicht in den Stufen-Check ein (andere Stufe als geplant)", () => {
    const { planId, workoutIds } = legeBlockAn(db, { einheiten: 12, satz });
    const slots = getPlanSlotsMitId(db, planId).filter((s) => s.muster === "KN");
    const ersatz = alleUebungen(db).find(
      (u) => u.muster === "KN" && !slots.some((s) => s.exerciseId === u.id),
    )!;
    for (const s of slots) {
      for (const w of workoutIds.slice(8)) {
        db.update(setLog)
          .set({ exerciseId: ersatz.id })
          .where(and(eq(setLog.workoutId, w), eq(setLog.planSlotId, s.id)))
          .run();
      }
    }
    const kn = ladeStufenCheck(db, getPlan(db, planId)!).find((e) => e.muster === "KN")!;
    expect(kn).toMatchObject({ einheiten: 0, empfehlung: "halten", grund: "zu_wenig_daten" });
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
