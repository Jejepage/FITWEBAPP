import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { setLog, workout } from "@/db/schema";
import { neueSeedDb } from "@/db/test-utils";
import type { Db } from "@/db/types";
import { getPlanSlotsMitId } from "./plans";
import { legeBlockAn } from "./test-helfer";
import {
  blockUebersicht,
  ladeEinheit,
  ladeUebungsVerlauf,
  listeEinheiten,
  uebungenMitVerlauf,
} from "./verlauf";

let db: Db;
beforeEach(() => {
  db = neueSeedDb();
});

describe("listeEinheiten", () => {
  it("nur abgeschlossene Einheiten, neueste zuerst, mit Satzzahl", () => {
    const { workoutIds } = legeBlockAn(db, { einheiten: 4 });
    db.update(workout).set({ status: "abgebrochen" }).where(eq(workout.id, workoutIds[1]!)).run();
    const { liste, gesamt } = listeEinheiten(db);
    expect(gesamt).toBe(3);
    expect(liste.map((e) => e.id)).toEqual([workoutIds[3], workoutIds[2], workoutIds[0]]);
    expect(liste[0]).toMatchObject({ einheit: "B", woche: 2, adHoc: false, saetze: 18 });
  });

  it("begrenzt die Liste, meldet aber die Gesamtzahl", () => {
    legeBlockAn(db, { einheiten: 5 });
    const { liste, gesamt } = listeEinheiten(db, 2);
    expect(liste).toHaveLength(2);
    expect(gesamt).toBe(5);
  });
});

describe("ladeEinheit", () => {
  it("gruppiert je Übung in Ablaufreihenfolge mit allen Runden", () => {
    const { workoutIds, planId } = legeBlockAn(db, { einheiten: 1 });
    const e = ladeEinheit(db, workoutIds[0]!)!;
    expect(e).toMatchObject({
      einheit: "A",
      woche: 1,
      status: "abgeschlossen",
      profilName: "Studio",
    });
    expect(e.gruppen).toHaveLength(6);
    expect(e.gruppen.every((g) => g.saetze.length === 3)).toBe(true);
    expect(e.gruppen.map((g) => g.muster)).toEqual(["KN", "DH", "ZH", "HB", "DV", "ZV"]);
    expect(e.gruppen[0]?.exerciseId).toBe(
      getPlanSlotsMitId(db, planId).find(
        (s) => s.einheit === "A" && s.block === "1" && s.position === 1,
      )!.exerciseId,
    );
    expect(e.gruppen[0]?.saetze.map((s) => s.runde)).toEqual([1, 2, 3]);
    expect(e.gruppen[0]?.ersetzt).toBe(false);
  });

  it("Ersatzübung wird als ersetzt markiert", () => {
    const { workoutIds, planId } = legeBlockAn(db, { einheiten: 1 });
    const slot = getPlanSlotsMitId(db, planId).find((s) => s.einheit === "A" && s.muster === "KN")!;
    db.update(setLog).set({ exerciseId: "KN-01" }).where(eq(setLog.planSlotId, slot.id)).run();
    const e = ladeEinheit(db, workoutIds[0]!)!;
    const g = e.gruppen.find((x) => x.muster === "KN")!;
    expect(g.exerciseId).toBe("KN-01");
    expect(g.ersetzt).toBe(slot.exerciseId !== "KN-01");
  });

  it("unbekannte Einheit: null", () => {
    expect(ladeEinheit(db, 999)).toBeNull();
  });
});

describe("Übungsverlauf", () => {
  it("listet Übungen mit Daten und zählt die Einheiten", () => {
    legeBlockAn(db, { einheiten: 3 });
    const liste = uebungenMitVerlauf(db);
    expect(liste).toHaveLength(12); // 6 Übungen in A, 6 in B
    const ersteA = liste.find((u) => u.muster === "KN" && u.einheiten === 2);
    expect(ersteA).toBeDefined();
  });

  it("Verlauf einer Übung: nur ihre Einheiten, älteste zuerst, Ad-hoc markiert", () => {
    const { planId } = legeBlockAn(db, { einheiten: 5, adHoc: (n) => n === 2 });
    const slot = getPlanSlotsMitId(db, planId).find((s) => s.einheit === "A" && s.muster === "KN")!;
    const v = ladeUebungsVerlauf(db, slot.exerciseId)!;
    expect(v.verlauf.zeilen).toHaveLength(3); // Einheiten 0, 2, 4
    expect(v.verlauf.zeilen.map((z) => z.adHoc)).toEqual([false, true, false]);
    expect(v.verlauf.zeilen.map((z) => z.woche)).toEqual([1, 2, 3]);
    expect(v.verlauf.mitGewicht).toBe(true);
    expect(v.verlauf.zeilen[0]?.volumen).toBe(300); // 3 × 10 kg × 10
  });

  it("abgebrochene Einheiten fehlen im Verlauf", () => {
    const { planId, workoutIds } = legeBlockAn(db, { einheiten: 3 });
    db.update(workout).set({ status: "abgebrochen" }).where(eq(workout.id, workoutIds[2]!)).run();
    const slot = getPlanSlotsMitId(db, planId).find((s) => s.einheit === "A" && s.muster === "KN")!;
    expect(ladeUebungsVerlauf(db, slot.exerciseId)!.verlauf.zeilen).toHaveLength(1);
  });

  it("unbekannte Übung: null; bekannte ohne Daten: leer", () => {
    expect(ladeUebungsVerlauf(db, "XX-99")).toBeNull();
    expect(ladeUebungsVerlauf(db, "KN-01")!.verlauf.zeilen).toEqual([]);
  });
});

describe("blockUebersicht", () => {
  it("zeigt geplante und absolvierte Einheiten je Woche", () => {
    legeBlockAn(db, { einheiten: 5 });
    const [aktiv] = blockUebersicht(db);
    expect(aktiv).toMatchObject({
      status: "aktiv",
      geplant: 12,
      absolviert: 5,
      profilName: "Studio",
    });
    expect(aktiv?.wochen).toEqual([2, 2, 1, 0, 0, 0]);
  });

  it("3×/Woche: 18 geplant", () => {
    legeBlockAn(db, { einheiten: 4, einheitenProWoche: 3 });
    const [aktiv] = blockUebersicht(db);
    expect(aktiv).toMatchObject({ geplant: 18, absolviert: 4 });
    expect(aktiv?.wochen).toEqual([3, 1, 0, 0, 0, 0]);
  });
});
