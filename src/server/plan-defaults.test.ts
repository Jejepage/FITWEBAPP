import { describe, expect, it } from "vitest";
import { equipmentProfile } from "@/db/schema";
import { neueDb, neueSeedDb } from "@/db/test-utils";
import { updateSettings } from "./settings";
import { ladePlanStandard } from "./plan-defaults";
import { listProfiles } from "./profiles";
import { MUSTER } from "@/domain/types";

describe("ladePlanStandard", () => {
  it("nimmt Standardprofil und Einstellungen", () => {
    const db = neueSeedDb();
    const s = ladePlanStandard(db, new Date("2026-10-07T10:00:00Z"))!;
    expect(s.profilId).toBe(listProfiles(db).find((p) => p.istStandard)!.id);
    expect(s).toMatchObject({ einheitenProWoche: 2, zusatzblock: false, heute: "2026-10-07" });
    const stufen = Object.fromEntries(MUSTER.map((m) => [m, 4])) as Record<
      (typeof MUSTER)[number],
      number
    >;
    updateSettings(db, { stufen, einheitenProWoche: 3, zusatzblock: true, aufwaermenText: "x" });
    expect(ladePlanStandard(db)).toMatchObject({ einheitenProWoche: 3, zusatzblock: true });
    expect(ladePlanStandard(db)!.stufen.KN).toBe(4);
  });

  it("gibt null zurück, wenn es kein Profil gibt", () => {
    const db = neueDb();
    expect(db.select().from(equipmentProfile).all()).toHaveLength(0);
    expect(ladePlanStandard(db)).toBeNull();
  });
});
