import { beforeEach, describe, expect, it } from "vitest";
import { neueSeedDb } from "@/db/test-utils";
import type { Db } from "@/db/types";
import { ladeAdHocVorschau } from "./ad-hoc-vorschau";
import { legeBlockAn, legePlanAn } from "./test-helfer";
import { listProfiles } from "./profiles";

let db: Db;
const profilId = (key: string) => listProfiles(db).find((p) => p.seedKey === key)!.id;
beforeEach(() => {
  db = neueSeedDb();
});

describe("ladeAdHocVorschau", () => {
  it("ohne Plan: kein_plan", () => {
    expect(ladeAdHocVorschau(db, profilId("unterwegs"), false)).toEqual({ art: "kein_plan" });
  });

  it("Unterwegs: sechs Zeilen der Einheit A, ersetzte Übungen markiert", () => {
    legePlanAn(db);
    const v = ladeAdHocVorschau(db, profilId("unterwegs"), false);
    if (v.art !== "ok") throw new Error(v.art);
    expect(v).toMatchObject({
      einheit: "A",
      woche: 1,
      profilName: "Unterwegs",
      istPlanProfil: false,
    });
    expect(v.zeilen).toHaveLength(6);
    expect(v.zeilen.some((z) => z.ersetzt)).toBe(true);
    for (const z of v.zeilen) expect(z.ersetzt).toBe(z.heuteId !== z.geplantId);
    expect(v.fehlendeMuster).toEqual([]);
  });

  it("Zusatzblock schaltet zwei Zeilen dazu", () => {
    legePlanAn(db);
    const v = ladeAdHocVorschau(db, profilId("unterwegs"), true);
    if (v.art !== "ok") throw new Error(v.art);
    expect(v.zeilen).toHaveLength(8);
  });

  it("Planprofil: keine Ersetzungen, kein Ad-hoc", () => {
    legePlanAn(db);
    const v = ladeAdHocVorschau(db, profilId("studio"), false);
    if (v.art !== "ok") throw new Error(v.art);
    expect(v.istPlanProfil).toBe(true);
    expect(v.zeilen.every((z) => !z.ersetzt)).toBe(true);
  });

  it("zeigt die Einheit, die nach dem Fortschritt fällig ist", () => {
    legeBlockAn(db, { einheiten: 1 });
    const v = ladeAdHocVorschau(db, profilId("studio"), false);
    if (v.art !== "ok") throw new Error(v.art);
    expect(v).toMatchObject({ einheit: "B", woche: 1 });
  });

  it("Block fertig und unbekanntes Profil", () => {
    legeBlockAn(db, { einheiten: 12 });
    expect(ladeAdHocVorschau(db, profilId("studio"), false)).toEqual({ art: "block_fertig" });
    const db2 = neueSeedDb();
    legePlanAn(db2);
    expect(ladeAdHocVorschau(db2, 9999, false)).toEqual({ art: "profil_unbekannt" });
  });
});
