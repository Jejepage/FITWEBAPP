import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { exercise, plan, planSlot } from "@/db/schema";
import { neueSeedDb } from "@/db/test-utils";
import type { Db } from "@/db/types";
import { erfuellt } from "@/domain/equipment";
import { SLOT_VORLAGE, type SlotZuordnung } from "@/domain/plan-types";
import { testProfile } from "@/domain/test-katalog";
import { MUSTER, type Muster } from "@/domain/types";
import { alleUebungen } from "./exercises";
import {
  createPlan,
  getActivePlan,
  getPlan,
  getPlanSlots,
  setzePlanEquipment,
  uebungsIdsVonPlan,
  type PlanEingabe,
} from "./plans";

let db: Db;
beforeEach(() => {
  db = neueSeedDb();
});

const equipmentVon = (key: string) => testProfile.find((p) => p.seedKey === key)!.equipment;
const stufen = Object.fromEntries(MUSTER.map((m) => [m, 2])) as Record<Muster, number>;

/** Einfache Belegung für Tests (kein Generator): erste passende Übung je Muster. */
function belegung(key = "studio", wahl = 0): SlotZuordnung[] {
  const equipment = equipmentVon(key);
  return SLOT_VORLAGE.map((v) => {
    const kandidaten = alleUebungen(db).filter(
      (u) => u.muster === v.muster && erfuellt(u.equipment, equipment),
    );
    return { ...v, exerciseId: kandidaten[wahl % kandidaten.length]!.id };
  });
}

const eingabe = (o: Partial<PlanEingabe> = {}): PlanEingabe => ({
  equipment: equipmentVon("studio"),
  gewichte: {},
  startDatum: "2026-10-07",
  einheitenProWoche: 2,
  zusatzblock: false,
  stufen,
  vorgaengerId: null,
  slots: belegung(),
  ...o,
});

describe("createPlan", () => {
  it("speichert Plan und 16 Slots und aktiviert ihn", () => {
    const r = createPlan(db, eingabe());
    expect(r.ok).toBe(true);
    const id = (r as { id: number }).id;
    expect(getActivePlan(db)?.id).toBe(id);
    expect(getPlan(db, id)).toMatchObject({
      status: "aktiv",
      startDatum: "2026-10-07",
      einheitenProWoche: 2,
      zusatzblock: false,
      vorgaengerId: null,
    });
    const slots = getPlanSlots(db, id);
    expect(slots).toHaveLength(16);
    expect(slots.map((s) => [s.einheit, s.block, s.position, s.muster])).toEqual(
      SLOT_VORLAGE.map((v) => [v.einheit, v.block, v.position, v.muster]),
    );
  });

  it("ein neuer Plan schließt den bisher aktiven ab; es gibt immer nur einen aktiven", () => {
    const erster = createPlan(db, eingabe()) as { id: number };
    const zweiter = createPlan(
      db,
      eingabe({ slots: belegung("studio", 1), vorgaengerId: erster.id }),
    ) as {
      id: number;
    };
    expect(getPlan(db, erster.id)!.status).toBe("abgeschlossen");
    expect(getPlan(db, zweiter.id)).toMatchObject({ status: "aktiv", vorgaengerId: erster.id });
    expect(db.select().from(plan).where(eq(plan.status, "aktiv")).all()).toHaveLength(1);
    expect(getPlanSlots(db, erster.id)).toHaveLength(16); // alter Plan bleibt vollständig
  });

  it("uebungsIdsVonPlan liefert die verwendeten Übungen", () => {
    const r = createPlan(db, eingabe()) as { id: number };
    const ids = uebungsIdsVonPlan(db, r.id);
    expect(ids).toEqual(new Set(belegung().map((s) => s.exerciseId)));
  });

  it("lehnt eine inaktive Übung ab und ändert nichts", () => {
    const slots = belegung();
    db.update(exercise).set({ aktiv: false }).where(eq(exercise.id, slots[0]!.exerciseId)).run();
    expect(createPlan(db, eingabe({ slots }))).toEqual({ ok: false, code: "uebung_ungueltig" });
    expect(db.select().from(plan).all()).toHaveLength(0);
  });

  it("lehnt eine Übung ab, die das Equipment des Plans nicht erfüllt", () => {
    const slots = belegung("studio"); // Studio-Belegung enthält Maschinen/Langhantel
    const r = createPlan(db, eingabe({ equipment: equipmentVon("unterwegs"), slots }));
    expect(r).toEqual({ ok: false, code: "uebung_ungueltig" });
  });

  it("lehnt eine Übung aus dem falschen Muster ab", () => {
    const slots = belegung().map((s, i) => (i === 0 ? { ...s, exerciseId: "HB-01" } : s));
    expect(createPlan(db, eingabe({ slots }))).toEqual({ ok: false, code: "uebung_ungueltig" });
  });

  it("lehnt unvollständige, doppelte oder falsch zugeordnete Slots ab", () => {
    const slots = belegung();
    expect(createPlan(db, eingabe({ slots: slots.slice(1) })).ok).toBe(false);
    expect(createPlan(db, eingabe({ slots: [...slots.slice(1), slots[1]!] }))).toEqual({
      ok: false,
      code: "slots_unvollstaendig",
    });
    const falschesMuster = slots.map((s, i) => (i === 0 ? { ...s, muster: "HB" as Muster } : s));
    expect(createPlan(db, eingabe({ slots: falschesMuster })).ok).toBe(false);
  });

  it.each([
    [{ equipment: ["rudergeraet"] as never }, "equipment_ungueltig"],
    [{ equipment: ["keins"] as never }, "equipment_ungueltig"],
    [{ startDatum: "2026-02-30" }, "datum_ungueltig"],
    [{ einheitenProWoche: 4 }, "einheiten_ungueltig"],
    [{ stufen: { ...stufen, KN: 6 } }, "stufen_ungueltig"],
    [{ stufen: { ...stufen, HB: 0 } }, "stufen_ungueltig"],
    [{ stufen: { ...stufen, DH: 2.5 } }, "stufen_ungueltig"],
    [{ vorgaengerId: 9999 }, "vorgaenger_unbekannt"],
  ] as const)("lehnt %j ab", (override, code) => {
    expect(createPlan(db, eingabe(override))).toEqual({ ok: false, code });
    expect(db.select().from(plan).all()).toHaveLength(0);
  });

  it("ein abgelehnter Plan lässt den aktiven Plan unverändert", () => {
    const erster = createPlan(db, eingabe()) as { id: number };
    expect(createPlan(db, eingabe({ startDatum: "kaputt" })).ok).toBe(false);
    expect(getActivePlan(db)?.id).toBe(erster.id);
    expect(db.select().from(planSlot).all()).toHaveLength(16);
  });

  it("speichert die Stufen und den Zusatzblock-Schalter", () => {
    const r = createPlan(
      db,
      eingabe({ zusatzblock: true, einheitenProWoche: 3, stufen: { ...stufen, KN: 4 } }),
    ) as {
      id: number;
    };
    expect(getPlan(db, r.id)).toMatchObject({ zusatzblock: true, einheitenProWoche: 3 });
    expect(getPlan(db, r.id)!.stufen.KN).toBe(4);
  });
});

describe("Equipment im Plan", () => {
  it("speichert Equipment und Hantelgewichte mit dem Plan, Equipment in fester Reihenfolge", () => {
    const equipment = ["stange", "kurzhanteln", "bank", "kettlebell"] as const;
    const r = createPlan(
      db,
      eingabe({
        equipment,
        gewichte: { kurzhanteln: [8, 10] },
        slots: belegung("zuhause"),
      }),
    ) as { id: number };
    expect(getPlan(db, r.id)).toMatchObject({
      equipment: ["kurzhanteln", "kettlebell", "bank", "stange"],
      gewichte: { kurzhanteln: [8, 10] },
    });
  });

  it("setzePlanEquipment ändert Equipment und Gewichte, die Slots bleiben", () => {
    const r = createPlan(
      db,
      eingabe({ equipment: equipmentVon("zuhause"), slots: belegung("zuhause") }),
    ) as { id: number };
    const vorher = getPlanSlots(db, r.id);

    const neu = setzePlanEquipment(db, r.id, ["maschinen", "stange", "kurzhanteln"], {
      kurzhanteln: [12, 14],
    });
    expect(neu).toEqual({ ok: true });
    expect(getPlan(db, r.id)).toMatchObject({
      equipment: ["maschinen", "kurzhanteln", "stange"],
      gewichte: { kurzhanteln: [12, 14] },
    });
    expect(getPlanSlots(db, r.id)).toEqual(vorher);
  });

  it("setzePlanEquipment lehnt Unbekanntes und unbekannte Pläne ab, ohne etwas zu ändern", () => {
    const r = createPlan(db, eingabe()) as { id: number };
    const vorher = getPlan(db, r.id)!;
    expect(setzePlanEquipment(db, r.id, ["rudergeraet" as never], {})).toEqual({
      ok: false,
      code: "equipment_ungueltig",
    });
    expect(setzePlanEquipment(db, r.id, ["keins"], {})).toEqual({
      ok: false,
      code: "equipment_ungueltig",
    });
    expect(setzePlanEquipment(db, 9999, ["bank"], {})).toEqual({
      ok: false,
      code: "plan_unbekannt",
    });
    expect(getPlan(db, r.id)).toEqual(vorher);
  });

  it("setzePlanEquipment erlaubt auch kein Equipment (nur Ersatzübungen)", () => {
    const r = createPlan(db, eingabe()) as { id: number };
    expect(setzePlanEquipment(db, r.id, [], {})).toEqual({ ok: true });
    expect(getPlan(db, r.id)!.equipment).toEqual([]);
  });
});
