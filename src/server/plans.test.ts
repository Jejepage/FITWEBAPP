import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { exercise, plan, planSlot } from "@/db/schema";
import { neueSeedDb } from "@/db/test-utils";
import type { Db } from "@/db/types";
import { erfuellt } from "@/domain/equipment";
import { SLOT_VORLAGE, type SlotZuordnung } from "@/domain/plan-types";
import { MUSTER, type Muster } from "@/domain/types";
import { alleUebungen } from "./exercises";
import {
  createPlan,
  getActivePlan,
  getPlan,
  getPlanSlots,
  uebungsIdsVonPlan,
  type PlanEingabe,
} from "./plans";
import { listProfiles } from "./profiles";

let db: Db;
beforeEach(() => {
  db = neueSeedDb();
});

const profil = (key: string) => listProfiles(db).find((p) => p.seedKey === key)!;
const stufen = Object.fromEntries(MUSTER.map((m) => [m, 2])) as Record<Muster, number>;

/** Einfache Belegung für Tests (kein Generator): erste passende Übung je Muster. */
function belegung(key = "studio", wahl = 0): SlotZuordnung[] {
  const equipment = profil(key).equipment;
  return SLOT_VORLAGE.map((v) => {
    const kandidaten = alleUebungen(db).filter(
      (u) => u.muster === v.muster && erfuellt(u.equipment, equipment),
    );
    return { ...v, exerciseId: kandidaten[wahl % kandidaten.length]!.id };
  });
}

const eingabe = (o: Partial<PlanEingabe> = {}): PlanEingabe => ({
  profilId: profil("studio").id,
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

  it("lehnt eine Übung ab, die das Equipment des Profils nicht erfüllt", () => {
    const slots = belegung("studio"); // Studio-Belegung enthält Maschinen/Langhantel
    const r = createPlan(db, eingabe({ profilId: profil("unterwegs").id, slots }));
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
    [{ profilId: 9999 }, "profil_unbekannt"],
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
