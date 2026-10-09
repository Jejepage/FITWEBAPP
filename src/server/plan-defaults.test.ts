import { describe, expect, it } from "vitest";
import { neueDb, neueSeedDb } from "@/db/test-utils";
import { standardEquipment, standardGewichte } from "@/db/seed/defaults";
import { MUSTER } from "@/domain/types";
import { ladePlanStandard } from "./plan-defaults";
import { updateSettings } from "./settings";
import { legePlanAn } from "./test-helfer";

describe("ladePlanStandard", () => {
  it("nimmt für den ersten Plan die Voreinstellung für Equipment und die Einstellungen", () => {
    const db = neueSeedDb();
    const s = ladePlanStandard(db, new Date("2026-10-07T10:00:00Z"));
    expect(s.equipment).toEqual(standardEquipment);
    expect(s.gewichte).toEqual(standardGewichte);
    expect(s).toMatchObject({ einheitenProWoche: 2, zusatzblock: false, heute: "2026-10-07" });
    const stufen = Object.fromEntries(MUSTER.map((m) => [m, 4])) as Record<
      (typeof MUSTER)[number],
      number
    >;
    updateSettings(db, { stufen, einheitenProWoche: 3, zusatzblock: true, aufwaermenText: "x" });
    expect(ladePlanStandard(db)).toMatchObject({ einheitenProWoche: 3, zusatzblock: true });
    expect(ladePlanStandard(db).stufen.KN).toBe(4);
  });

  it("funktioniert auch ohne Seed (Einstellungen werden angelegt)", () => {
    const db = neueDb();
    expect(ladePlanStandard(db).equipment).toEqual(standardEquipment);
  });

  it("übernimmt das Equipment des zuletzt angelegten Plans", () => {
    const db = neueSeedDb();
    legePlanAn(db, {
      equipment: ["kurzhanteln", "bank", "stange"],
      gewichte: { kurzhanteln: [10, 12] },
    });
    const s = ladePlanStandard(db);
    expect(s.equipment).toEqual(["kurzhanteln", "bank", "stange"]);
    expect(s.gewichte).toEqual({ kurzhanteln: [10, 12] });
  });

  it("Folgeblock übernimmt Equipment, Einheiten pro Woche und Zusatzblock des Vorgängers", () => {
    const db = neueSeedDb();
    const { planId } = legePlanAn(db, {
      profil: "zuhause",
      gewichte: { kettlebell: [12, 16] },
      einheitenProWoche: 3,
      zusatzblock: true,
    });
    // ein späterer Plan darf den Vorgänger nicht überdecken
    legePlanAn(db, { profil: "studio" });
    const s = ladePlanStandard(db, undefined, planId);
    expect(s.equipment).toEqual(["kurzhanteln", "kettlebell", "bank", "stange"]);
    expect(s.gewichte).toEqual({ kettlebell: [12, 16] });
    expect(s).toMatchObject({ einheitenProWoche: 3, zusatzblock: true });
    // Unbekannter Vorgänger: normale Voreinstellungen (Equipment des letzten Plans)
    expect(ladePlanStandard(db, undefined, 999)).toMatchObject({ einheitenProWoche: 2 });
  });
});
