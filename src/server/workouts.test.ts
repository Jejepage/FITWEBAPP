import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { exercise, plan, workout } from "@/db/schema";
import { neueSeedDb } from "@/db/test-utils";
import type { Db } from "@/db/types";
import { getPlan, getPlanSlotsMitId } from "./plans";
import { legePlanAn } from "./test-helfer";
import {
  beendeWorkout,
  brecheWorkoutAb,
  ersetzeUebung,
  getLaufendesWorkout,
  getSaetze,
  getWorkout,
  letzteWerte,
  speichereSatz,
  startWorkout,
  zaehleAbgeschlosseneEinheiten,
} from "./workouts";

let db: Db;
let planId: number;
beforeEach(() => {
  db = neueSeedDb();
  ({ planId } = legePlanAn(db));
});

const start = (o: { zusatzblock?: boolean } = {}) => {
  const r = startWorkout(db, { heute: "2026-10-08", ...o });
  if (!r.ok) throw new Error(r.code);
  return r.id;
};

let zaehler = 0;
const satz = (workoutId: number, slotKey: string, o: Record<string, unknown> = {}) => {
  const slot = getPlanSlotsMitId(db, planId).find(
    (s) => `${s.einheit}-${s.block}-${s.position}` === slotKey,
  )!;
  zaehler++;
  return {
    id: `satz-${String(zaehler).padStart(8, "0")}`,
    workoutId,
    planSlotId: slot.id,
    exerciseId: slot.exerciseId,
    runde: 1,
    gewicht: 10,
    wdh: 10,
    sekunden: null,
    meter: null,
    rpe: 7,
    tempo: false,
    ...o,
  };
};

/** Speichert mindestens einen Satz und schließt die Einheit ab. */
const absolviere = (id: number, o: { notiz?: string } = {}) => {
  expect(speichereSatz(db, satz(id, "A-1-1")).ok || speichereSatz(db, satz(id, "B-1-1")).ok).toBe(
    true,
  );
  expect(beendeWorkout(db, id, o.notiz ?? null)).toEqual({ ok: true });
};

describe("startWorkout", () => {
  it("startet Einheit A in Woche 1 mit den Voreinstellungen des Plans", () => {
    const id = start();
    expect(getWorkout(db, id)).toMatchObject({
      planId,
      einheit: "A",
      woche: 1,
      datum: "2026-10-08",
      adHoc: false,
      zusatzblock: false,
      status: "laufend",
      ersetzungen: {},
    });
  });

  it("Zusatzblock lässt sich beim Start überschreiben", () => {
    expect(getWorkout(db, start({ zusatzblock: true }))!.zusatzblock).toBe(true);
  });

  it("es läuft höchstens eine Einheit: zweiter Start gibt die laufende zurück", () => {
    const id = start();
    expect(startWorkout(db, { heute: "2026-10-09" })).toEqual({ ok: true, id, neu: false });
    expect(db.select().from(workout).all()).toHaveLength(1);
  });

  it("ohne aktiven Plan nicht möglich", () => {
    db.update(plan).set({ status: "abgeschlossen" }).where(eq(plan.id, planId)).run();
    expect(startWorkout(db, { heute: "2026-10-08" })).toEqual({ ok: false, code: "kein_plan" });
  });

  it("2×/Woche: A, B, A, B … und Woche steigt nach zwei Einheiten", () => {
    const erwartet = [
      ["A", 1],
      ["B", 1],
      ["A", 2],
      ["B", 2],
      ["A", 3],
    ] as const;
    for (const [einheit, woche] of erwartet) {
      const id = start();
      expect(getWorkout(db, id), `Einheit ${einheit}`).toMatchObject({ einheit, woche });
      absolviere(id);
    }
  });

  it("3×/Woche: A-B-A, dann B-A-B", () => {
    db = neueSeedDb();
    ({ planId } = legePlanAn(db, { einheitenProWoche: 3 }));
    const folge = [];
    for (let i = 0; i < 6; i++) {
      const id = start();
      const w = getWorkout(db, id)!;
      folge.push(`${w.woche}${w.einheit}`);
      absolviere(id);
    }
    expect(folge).toEqual(["1A", "1B", "1A", "2B", "2A", "2B"]);
  });

  it("abgebrochene Einheiten zählen nicht für den Fortschritt", () => {
    const id = start();
    brecheWorkoutAb(db, id);
    const wieder = start();
    expect(wieder).not.toBe(id);
    expect(getWorkout(db, wieder)).toMatchObject({ einheit: "A", woche: 1 });
    expect(zaehleAbgeschlosseneEinheiten(db, planId)).toBe(0);
  });

  it("nach 12 Einheiten (2×/Woche) ist der Block fertig", () => {
    for (let i = 0; i < 12; i++) absolviere(start());
    expect(zaehleAbgeschlosseneEinheiten(db, planId)).toBe(12);
    expect(startWorkout(db, { heute: "2026-10-08" })).toEqual({ ok: false, code: "block_fertig" });
  });

  it("ein neuer Plan bricht die laufende Einheit des alten Plans ab", () => {
    const id = start();
    legePlanAn(db, { profil: "unterwegs" });
    expect(getWorkout(db, id)!.status).toBe("abgebrochen");
    expect(getLaufendesWorkout(db)).toBeNull();
    expect(getPlan(db, planId)!.status).toBe("abgeschlossen");
  });
});

describe("speichereSatz", () => {
  it("speichert einen Satz mit allen Werten", () => {
    const id = start();
    const s = satz(id, "A-1-1", { gewicht: 12.5, wdh: 11, rpe: 7.5, tempo: true });
    expect(speichereSatz(db, s)).toEqual({ ok: true });
    expect(getSaetze(db, id)).toHaveLength(1);
    expect(getSaetze(db, id)[0]).toMatchObject({
      id: s.id,
      workoutId: id,
      runde: 1,
      gewicht: 12.5,
      wdh: 11,
      rpe: 7.5,
      tempo: true,
      erledigt: true,
    });
  });

  it("ist idempotent: gleiches Senden ergibt keinen zweiten Satz", () => {
    const id = start();
    const s = satz(id, "A-1-1");
    speichereSatz(db, s);
    speichereSatz(db, s);
    speichereSatz(db, s);
    expect(getSaetze(db, id)).toHaveLength(1);
  });

  it("lehnt Runden ab, die der Ablauf nicht kennt (Zusatzblock hat zwei Runden)", () => {
    const id = start({ zusatzblock: true });
    expect(speichereSatz(db, satz(id, "A-Z-1", { runde: 2 })).ok).toBe(true);
    expect(speichereSatz(db, satz(id, "A-Z-1", { runde: 3 }))).toEqual({
      ok: false,
      code: "slot_ungueltig",
    });
    expect(getSaetze(db, id)).toHaveLength(1);
  });

  it("legt pro Schritt nur eine Zeile an, auch bei anderer UUID", () => {
    const id = start();
    speichereSatz(db, satz(id, "A-1-1", { wdh: 10 }));
    expect(speichereSatz(db, satz(id, "A-1-1", { wdh: 12 })).ok).toBe(true);
    const saetze = getSaetze(db, id);
    expect(saetze).toHaveLength(1);
    expect(saetze[0]?.wdh).toBe(12);
  });

  it("verschiebt einen vorhandenen Satz nicht in einen anderen Schritt", () => {
    const id = start();
    const s = satz(id, "A-1-1");
    speichereSatz(db, s);
    const anderer = satz(id, "A-1-2");
    expect(speichereSatz(db, { ...anderer, id: s.id })).toEqual({ ok: false, code: "id_belegt" });
    expect(speichereSatz(db, { ...s, runde: 2 })).toEqual({ ok: false, code: "id_belegt" });
  });

  it("überschreibt denselben Satz bei Korrektur (gleiche ID, neue Werte)", () => {
    const id = start();
    const s = satz(id, "A-1-1", { wdh: 10, rpe: 7 });
    speichereSatz(db, s);
    expect(speichereSatz(db, { ...s, wdh: 12, rpe: 8 })).toEqual({ ok: true });
    const gespeichert = getSaetze(db, id);
    expect(gespeichert).toHaveLength(1);
    expect(gespeichert[0]).toMatchObject({ wdh: 12, rpe: 8 });
  });

  it("lehnt ungültige Werte ab", () => {
    const id = start();
    expect(speichereSatz(db, satz(id, "A-1-1", { rpe: 11 }))).toEqual({
      ok: false,
      code: "werte_ungueltig",
    });
    expect(speichereSatz(db, satz(id, "A-1-1", { wdh: null }))).toEqual({
      ok: false,
      code: "werte_ungueltig",
    });
    expect(speichereSatz(db, "kaputt")).toEqual({ ok: false, code: "werte_ungueltig" });
    expect(getSaetze(db, id)).toHaveLength(0);
  });

  it("lehnt unbekannte oder nicht laufende Einheiten ab", () => {
    const id = start();
    const s = satz(id, "A-1-1");
    expect(speichereSatz(db, { ...s, workoutId: 9999 })).toEqual({
      ok: false,
      code: "workout_unbekannt",
    });
    speichereSatz(db, s);
    beendeWorkout(db, id, null);
    expect(speichereSatz(db, satz(id, "A-1-2"))).toEqual({ ok: false, code: "nicht_laufend" });
  });

  it("lehnt einen Slot der anderen Einheit, eines fremden Plans oder des ausgeschalteten Zusatzblocks ab", () => {
    const id = start(); // Einheit A, ohne Zusatzblock
    const b = getPlanSlotsMitId(db, planId).find((s) => s.einheit === "B")!;
    expect(
      speichereSatz(db, { ...satz(id, "A-1-1"), planSlotId: b.id, exerciseId: b.exerciseId }),
    ).toEqual({
      ok: false,
      code: "slot_ungueltig",
    });
    expect(speichereSatz(db, satz(id, "A-Z-1"))).toEqual({ ok: false, code: "slot_ungueltig" });
    expect(speichereSatz(db, { ...satz(id, "A-1-1"), planSlotId: 999999 })).toEqual({
      ok: false,
      code: "slot_ungueltig",
    });
  });

  it("Zusatzblock-Slots sind erlaubt, wenn der Zusatzblock für die Einheit aktiv ist", () => {
    const id = start({ zusatzblock: true });
    expect(speichereSatz(db, satz(id, "A-Z-1"))).toEqual({ ok: true });
  });

  it("lehnt eine Übung ab, die weder geplant noch ersetzt ist", () => {
    const id = start();
    expect(speichereSatz(db, satz(id, "A-1-1", { exerciseId: "HB-01" }))).toEqual({
      ok: false,
      code: "uebung_ungueltig",
    });
  });

  it("eine ID einer anderen Einheit kann nicht überschrieben werden", () => {
    const erste = start();
    const s = satz(erste, "A-1-1");
    speichereSatz(db, s);
    beendeWorkout(db, erste, null);
    const zweite = start(); // Einheit B
    const slotB = getPlanSlotsMitId(db, planId).find(
      (x) => x.einheit === "B" && x.block === "1" && x.position === 1,
    )!;
    expect(
      speichereSatz(db, {
        ...s,
        workoutId: zweite,
        planSlotId: slotB.id,
        exerciseId: slotB.exerciseId,
      }),
    ).toEqual({ ok: false, code: "id_belegt" });
  });
});

describe("ersetzeUebung", () => {
  it("ersetzt nur für diese Einheit, der Plan bleibt unverändert", () => {
    const id = start();
    const slot = getPlanSlotsMitId(db, planId).find(
      (s) => s.einheit === "A" && s.block === "1" && s.position === 1,
    )!;
    // Studio-Slot A-1-1 ist KN-02; KN-03 (Körpergewicht) ist ein passender Ersatz im selben Muster
    expect(ersetzeUebung(db, id, slot.id, "KN-03")).toEqual({ ok: true, exerciseId: "KN-03" });
    expect(getWorkout(db, id)!.ersetzungen).toEqual({ [String(slot.id)]: "KN-03" });
    expect(getPlanSlotsMitId(db, planId).find((s) => s.id === slot.id)!.exerciseId).toBe(
      slot.exerciseId,
    );
    // Sätze werden mit der Ersatzübung gespeichert
    expect(speichereSatz(db, satz(id, "A-1-1", { exerciseId: "KN-03" }))).toEqual({ ok: true });
  });

  it("die geplante Übung hebt den Ersatz wieder auf", () => {
    const id = start();
    const slot = getPlanSlotsMitId(db, planId).find(
      (s) => s.einheit === "A" && s.position === 1 && s.block === "1",
    )!;
    ersetzeUebung(db, id, slot.id, "KN-03");
    expect(ersetzeUebung(db, id, slot.id, slot.exerciseId).ok).toBe(true);
    expect(getWorkout(db, id)!.ersetzungen).toEqual({});
  });

  it("lehnt Übungen aus anderem Muster, inaktive oder nicht machbare ab", () => {
    const id = start();
    const slot = getPlanSlotsMitId(db, planId).find(
      (s) => s.einheit === "A" && s.position === 1 && s.block === "1",
    )!;
    expect(ersetzeUebung(db, id, slot.id, "HB-01")).toEqual({
      ok: false,
      code: "uebung_ungueltig",
    });
    db.update(exercise).set({ aktiv: false }).where(eq(exercise.id, "KN-04")).run();
    expect(ersetzeUebung(db, id, slot.id, "KN-04")).toEqual({
      ok: false,
      code: "uebung_ungueltig",
    });
    expect(ersetzeUebung(db, id, slot.id, "XX-99")).toEqual({
      ok: false,
      code: "uebung_ungueltig",
    });
    expect(getWorkout(db, id)!.ersetzungen).toEqual({});
  });

  it("Equipment des Profils wird beachtet", () => {
    db = neueSeedDb();
    ({ planId } = legePlanAn(db, { profil: "unterwegs" }));
    const id = start();
    const slot = getPlanSlotsMitId(db, planId).find(
      (s) => s.einheit === "A" && s.position === 1 && s.block === "1",
    )!;
    expect(ersetzeUebung(db, id, slot.id, "KN-08")).toEqual({
      ok: false,
      code: "uebung_ungueltig",
    }); // Langhantel
    expect(ersetzeUebung(db, id, slot.id, "KN-05")).toEqual({ ok: true, exerciseId: "KN-05" });
  });

  it("nicht in beendeten Einheiten und nicht für fremde Slots", () => {
    const id = start();
    const b = getPlanSlotsMitId(db, planId).find((s) => s.einheit === "B")!;
    expect(ersetzeUebung(db, id, b.id, "KN-03")).toEqual({ ok: false, code: "slot_ungueltig" });
    brecheWorkoutAb(db, id);
    const a = getPlanSlotsMitId(db, planId).find((s) => s.einheit === "A")!;
    expect(ersetzeUebung(db, id, a.id, "KN-03")).toEqual({ ok: false, code: "nicht_laufend" });
  });
});

describe("beendeWorkout / brecheWorkoutAb", () => {
  it("schließt mit Notiz ab (getrimmt) und setzt das Ende", () => {
    const id = start();
    speichereSatz(db, satz(id, "A-1-1"));
    expect(
      beendeWorkout(db, id, "  Knie fühlte sich gut an.  ", new Date("2026-10-08T18:00:00Z")),
    ).toEqual({ ok: true });
    expect(getWorkout(db, id)).toMatchObject({
      status: "abgeschlossen",
      notiz: "Knie fühlte sich gut an.",
      beendetAm: "2026-10-08T18:00:00.000Z",
    });
    expect(zaehleAbgeschlosseneEinheiten(db, planId)).toBe(1);
  });

  it("leere Notiz wird nicht gespeichert, lange Notiz gekürzt", () => {
    const a = start();
    speichereSatz(db, satz(a, "A-1-1"));
    beendeWorkout(db, a, "   ");
    expect(getWorkout(db, a)!.notiz).toBeNull();
    const b = start();
    speichereSatz(db, satz(b, "B-1-1"));
    beendeWorkout(db, b, "x".repeat(5000));
    expect(getWorkout(db, b)!.notiz).toHaveLength(2000);
  });

  it("ohne gespeicherten Satz lässt sich nicht abschließen", () => {
    expect(beendeWorkout(db, start(), null)).toEqual({ ok: false, code: "keine_saetze" });
  });

  it("eine beendete Einheit lässt sich nicht erneut beenden oder abbrechen", () => {
    const id = start();
    speichereSatz(db, satz(id, "A-1-1"));
    beendeWorkout(db, id, null);
    expect(beendeWorkout(db, id, null)).toEqual({ ok: false, code: "nicht_laufend" });
    expect(brecheWorkoutAb(db, id)).toEqual({ ok: false, code: "nicht_laufend" });
  });

  it("Abbrechen behält die Sätze", () => {
    const id = start();
    speichereSatz(db, satz(id, "A-1-1"));
    expect(brecheWorkoutAb(db, id)).toEqual({ ok: true });
    expect(getWorkout(db, id)!.status).toBe("abgebrochen");
    expect(getSaetze(db, id)).toHaveLength(1);
  });

  it("unbekannte Einheit", () => {
    expect(beendeWorkout(db, 9999, null)).toEqual({ ok: false, code: "workout_unbekannt" });
    expect(brecheWorkoutAb(db, 9999)).toEqual({ ok: false, code: "workout_unbekannt" });
  });
});

describe("letzteWerte", () => {
  const ersterSlot = () =>
    getPlanSlotsMitId(db, planId).find(
      (s) => s.einheit === "A" && s.block === "1" && s.position === 1,
    )!;

  it("liefert die Sätze der letzten abgeschlossenen Einheit in Rundenreihenfolge", () => {
    const slot = ersterSlot();
    const id = start();
    speichereSatz(db, satz(id, "A-1-1", { runde: 2, wdh: 9 }));
    speichereSatz(db, satz(id, "A-1-1", { runde: 1, wdh: 10 }));
    beendeWorkout(db, id, null);
    const h = letzteWerte(db, [slot.exerciseId]).get(slot.exerciseId)!;
    expect(h.anzeige?.saetze.map((s) => s.wdh)).toEqual([10, 9]);
    expect(h.anzeige).toMatchObject({ woche: 1, datum: "2026-10-08", adHoc: false });
    expect(h.vorschlagBasis).toEqual(h.anzeige);
  });

  it("ohne Daten: null", () => {
    const h = letzteWerte(db, ["KN-03"]).get("KN-03")!;
    expect(h).toEqual({ anzeige: null, vorschlagBasis: null });
  });

  it("ignoriert abgebrochene und laufende Einheiten sowie die ausgenommene Einheit", () => {
    const slot = ersterSlot();
    const abgebrochen = start();
    speichereSatz(db, satz(abgebrochen, "A-1-1"));
    brecheWorkoutAb(db, abgebrochen);
    const laufend = start();
    speichereSatz(db, satz(laufend, "A-1-1", { runde: 1 }));
    expect(letzteWerte(db, [slot.exerciseId]).get(slot.exerciseId)!.anzeige).toBeNull();
    beendeWorkout(db, laufend, null);
    expect(letzteWerte(db, [slot.exerciseId], laufend).get(slot.exerciseId)!.anzeige).toBeNull();
    expect(letzteWerte(db, [slot.exerciseId]).get(slot.exerciseId)!.anzeige).not.toBeNull();
  });

  it("Vorschlagsbasis überspringt Ad-hoc-Einheiten und Woche 6, die Anzeige nicht", () => {
    const slot = ersterSlot();
    const gut = start();
    speichereSatz(db, satz(gut, "A-1-1", { wdh: 10 }));
    beendeWorkout(db, gut, null);

    // Einheit B trainiert dieselbe Übung über eine Ersetzung und wird als Ad-hoc markiert
    // (der echte Ad-hoc-Start folgt in Abschnitt 8).
    const adHoc = start();
    const bSlot = getPlanSlotsMitId(db, planId).find(
      (s) => s.einheit === "B" && s.block === "2" && s.position === 1,
    )!;
    expect(ersetzeUebung(db, adHoc, bSlot.id, slot.exerciseId).ok).toBe(true);
    expect(
      speichereSatz(db, satz(adHoc, "B-2-1", { exerciseId: slot.exerciseId, wdh: 6 })).ok,
    ).toBe(true);
    db.update(workout).set({ adHoc: true }).where(eq(workout.id, adHoc)).run();
    beendeWorkout(db, adHoc, null);

    const h = letzteWerte(db, [slot.exerciseId]).get(slot.exerciseId)!;
    expect(h.anzeige).toMatchObject({ adHoc: true });
    expect(h.anzeige!.saetze[0]!.wdh).toBe(6);
    expect(h.vorschlagBasis).toMatchObject({ adHoc: false });
    expect(h.vorschlagBasis!.saetze[0]!.wdh).toBe(10);

    // Woche 6 zählt ebenfalls nicht als Basis
    const woche6 = start();
    db.update(workout).set({ woche: 6 }).where(eq(workout.id, woche6)).run();
    speichereSatz(db, satz(woche6, "A-1-1", { wdh: 5 }));
    beendeWorkout(db, woche6, null);
    const h2 = letzteWerte(db, [slot.exerciseId]).get(slot.exerciseId)!;
    expect(h2.anzeige!.saetze[0]!.wdh).toBe(5);
    expect(h2.vorschlagBasis!.saetze[0]!.wdh).toBe(10);
  });

  it("fragt mehrere Übungen auf einmal ab", () => {
    const id = start();
    speichereSatz(db, satz(id, "A-1-1"));
    speichereSatz(db, satz(id, "A-1-2"));
    beendeWorkout(db, id, null);
    const slots = getPlanSlotsMitId(db, planId).filter((s) => s.einheit === "A" && s.block === "1");
    const ids = slots.map((s) => s.exerciseId);
    const h = letzteWerte(db, ids);
    expect(h.get(slots[0]!.exerciseId)!.anzeige).not.toBeNull();
    expect(h.get(slots[1]!.exerciseId)!.anzeige).not.toBeNull();
    expect(h.get(slots[2]!.exerciseId)!.anzeige).toBeNull();
    expect(letzteWerte(db, []).size).toBe(0);
  });
});
