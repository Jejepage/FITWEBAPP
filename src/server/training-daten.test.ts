import { beforeEach, describe, expect, it } from "vitest";
import { neueSeedDb } from "@/db/test-utils";
import type { Db } from "@/db/types";
import { getPlanSlotsMitId, setzePlanEquipment } from "./plans";
import { ladePlanStandard } from "./plan-defaults";
import { legePlanAn } from "./test-helfer";
import { ladeTrainingsDaten, ladeUebungInfo } from "./training-daten";
import { beendeWorkout, ersetzeUebung, speichereSatz, startWorkout } from "./workouts";

let db: Db;
let planId: number;
beforeEach(() => {
  db = neueSeedDb();
  ({ planId } = legePlanAn(db));
});

const start = (zusatzblock?: boolean) => {
  const r = startWorkout(db, { heute: "2026-10-08", zusatzblock });
  if (!r.ok) throw new Error(r.code);
  return r.id;
};
const slotA = (block: string, position: number) =>
  getPlanSlotsMitId(db, planId).find(
    (s) => s.einheit === "A" && s.block === block && s.position === position,
  )!;

let n = 0;
const speichere = (workoutId: number, slot: ReturnType<typeof slotA>, runde: number, o = {}) => {
  n++;
  return speichereSatz(db, {
    id: `tdaten-${String(n).padStart(8, "0")}`,
    workoutId,
    planSlotId: slot.id,
    exerciseId: slot.exerciseId,
    runde,
    gewicht: null,
    wdh: 12,
    sekunden: null,
    meter: null,
    rpe: 7,
    tempo: false,
    ...o,
  });
};

describe("ladeTrainingsDaten", () => {
  it("unbekannte Einheit → null", () => {
    expect(ladeTrainingsDaten(db, 9999)).toBeNull();
  });

  it("liefert Schritte, Übungsinfos und Vorgaben für Einheit A, Woche 1", () => {
    const d = ladeTrainingsDaten(db, start())!;
    expect(d).toMatchObject({ einheit: "A", woche: 1, zusatzblock: false });
    expect(d.vorgabeText).toBe("3 × 10–12 Wdh · Leicht");
    expect(d.schritte).toHaveLength(18);
    expect(d.gespeichert).toEqual([]);
    expect(d.aufwaermenText).toMatch(/Mobilisation/);
    for (const s of d.schritte) {
      const u = d.uebungen[s.exerciseId]!;
      expect(u, s.exerciseId).toBeDefined();
      expect(u.ausfuehrung.length).toBeGreaterThanOrEqual(3);
      expect(u.zielText).toMatch(/\d/);
    }
  });

  it("mit Zusatzblock 22 Schritte und Ersatzkandidaten auch für Z", () => {
    const d = ladeTrainingsDaten(db, start(true))!;
    expect(d.schritte).toHaveLength(22);
    expect(d.ersatzKandidaten[slotA("Z", 1).id]!.length).toBeGreaterThan(0);
  });

  it("ohne Zusatzblock keine Kandidaten für Z-Slots", () => {
    const d = ladeTrainingsDaten(db, start())!;
    expect(d.ersatzKandidaten[slotA("Z", 1).id]).toBeUndefined();
    expect(d.ersatzKandidaten[slotA("1", 1).id]!.map((k) => k.id)).toContain(
      slotA("1", 1).exerciseId,
    );
  });

  it("erste Einheit: Vorschlag 'start' mit Untergrenze und ohne Gewicht", () => {
    const d = ladeTrainingsDaten(db, start())!;
    const u = d.uebungen[slotA("1", 2).exerciseId]!; // DH-03 Kurzhantel-Bankdrücken
    expect(u.vorschlag).toMatchObject({ grund: "start", gewicht: null, wdh: 10 });
    expect(u.letzte).toBeNull();
  });

  it("gespeicherte Sätze erscheinen mit Schritt-Schlüssel", () => {
    const id = start();
    const s = slotA("1", 1);
    speichere(id, s, 1);
    const d = ladeTrainingsDaten(db, id)!;
    expect(d.gespeichert).toHaveLength(1);
    expect(d.gespeichert[0]).toMatchObject({ key: `${s.id}:1`, exerciseId: s.exerciseId });
    expect(d.gespeichert[0]!.werte.wdh).toBe(12);
  });

  it("Historie: alle Sätze oben bei RPE 7 → Vorschlag mehr Gewicht, 'Letztes Mal' vorhanden", () => {
    const erste = start();
    const s = slotA("1", 2);
    for (const runde of [1, 2, 3]) speichere(erste, s, runde, { gewicht: 10, wdh: 12, rpe: 7 });
    beendeWorkout(db, erste, null);
    const zweite = start(); // B, Woche 1
    const bSlot = getPlanSlotsMitId(db, planId).find(
      (x) => x.einheit === "B" && x.exerciseId === s.exerciseId,
    );
    // Dieselbe Übung kommt in B nicht vor (A ≠ B); stattdessen Vorschlag über die Ersetzung prüfen:
    const blockEins = getPlanSlotsMitId(db, planId).find(
      (x) => x.einheit === "B" && x.block === "1" && x.position === 2,
    )!;
    expect(bSlot).toBeUndefined();
    expect(ersetzeUebung(db, zweite, blockEins.id, s.exerciseId)).toMatchObject({ ok: true });
    const d = ladeTrainingsDaten(db, zweite)!;
    const info = d.uebungen[s.exerciseId]!;
    expect(info.letzte?.saetze).toHaveLength(3);
    expect(info.letzte?.datum).toBe("2026-10-08");
    // Der Plan hat keine Hantelgewichte hinterlegt → +2,5 kg
    expect(info.vorschlag).toMatchObject({ grund: "mehr_gewicht", gewicht: 12.5, wdh: 10 });
  });

  it("ersetzte Übungen erscheinen in Schritten und Übungsinfos", () => {
    const id = start();
    const s = slotA("1", 1);
    expect(ersetzeUebung(db, id, s.id, "KN-03").ok).toBe(true);
    const d = ladeTrainingsDaten(db, id)!;
    expect(d.ersetzungen).toEqual({ [String(s.id)]: "KN-03" });
    expect(d.schritte.filter((x) => x.slotId === s.id).every((x) => x.exerciseId === "KN-03")).toBe(
      true,
    );
    expect(d.uebungen["KN-03"]).toBeDefined();
    expect(d.uebungen[s.exerciseId]).toBeDefined(); // geplante Übung bleibt für "zurück" verfügbar
  });

  it("Standardwerte für den Plan sind vorhanden (Sanity)", () => {
    expect(ladePlanStandard(db).equipment.length).toBeGreaterThan(0);
  });

  it("Hantelgewichte kommen aus dem Plan und lassen sich ändern, Vorschlag folgt sofort", () => {
    const hantel = "DH-03"; // Kurzhantel-Bankdrücken
    const erste = start();
    const s = slotA("1", 2);
    expect(ersetzeUebung(db, erste, s.id, hantel).ok).toBe(true);
    for (const runde of [1, 2, 3]) {
      speichere(erste, { ...s, exerciseId: hantel }, runde, { gewicht: 10, wdh: 12, rpe: 7 });
    }
    beendeWorkout(db, erste, null);
    const zweite = start(); // B, Woche 1
    const bSlot = getPlanSlotsMitId(db, planId).find(
      (x) => x.einheit === "B" && x.block === "1" && x.position === 2,
    )!;
    expect(ersetzeUebung(db, zweite, bSlot.id, hantel).ok).toBe(true);
    const vorschlag = () => ladeTrainingsDaten(db, zweite)!.uebungen[hantel]!.vorschlag;

    // keine Hantelgewichte im Plan → +2,5 kg
    expect(vorschlag()).toMatchObject({ grund: "mehr_gewicht", gewicht: 12.5 });
    const equipment = ["kurzhanteln", "bank", "maschinen", "stange", "langhantel", "kettlebell", "band"] as const;
    setzePlanEquipment(db, planId, equipment, { kurzhanteln: [10, 16, 24] });
    expect(vorschlag()).toMatchObject({ grund: "mehr_gewicht", gewicht: 16 });
    setzePlanEquipment(db, planId, equipment, { kurzhanteln: [10, 12, 14] });
    expect(vorschlag()).toMatchObject({ grund: "mehr_gewicht", gewicht: 12 });
  });

  describe("Tauschliste", () => {
    it("zeigt Planübungen vor Ersatzübungen und kennzeichnet Ersatzübungen", () => {
      const d = ladeTrainingsDaten(db, start())!;
      const liste = d.ersatzKandidaten[slotA("1", 1).id]!; // Kniebeuge
      const erstesErsatz = liste.findIndex((k) => k.ersatz);
      expect(erstesErsatz).toBeGreaterThan(0);
      expect(liste.slice(erstesErsatz).every((k) => k.ersatz)).toBe(true);
      expect(liste.slice(0, erstesErsatz).every((k) => !k.ersatz)).toBe(true);
    });

    it("enthält Ersatzübungen auch dann, wenn ihr Equipment im Plan fehlt (Band unterwegs)", () => {
      setzePlanEquipment(db, planId, ["stange"], {});
      const d = ladeTrainingsDaten(db, start())!;
      const zhSlot = getPlanSlotsMitId(db, planId).find(
        (x) => x.einheit === "A" && x.muster === "ZH",
      )!;
      const ids = d.ersatzKandidaten[zhSlot.id]!.map((k) => k.id);
      expect(ids).toContain("ZH-02"); // Rudern mit Band, nur Ersatz
      expect(ids).toContain("ZH-07"); // Rudern unter dem Tisch
      expect(ids).not.toContain("ZH-03"); // braucht ein Gerät, das fehlt
    });

    it("neues Equipment erscheint sofort in der Tauschliste", () => {
      setzePlanEquipment(db, planId, ["stange"], {});
      const id = start();
      const slot = slotA("1", 1);
      const vorher = ladeTrainingsDaten(db, id)!.ersatzKandidaten[slot.id]!.map((k) => k.id);
      expect(vorher).not.toContain("KN-02"); // Beinpresse
      setzePlanEquipment(db, planId, ["stange", "maschinen"], {});
      const nachher = ladeTrainingsDaten(db, id)!.ersatzKandidaten[slot.id]!.map((k) => k.id);
      expect(nachher).toContain("KN-02");
    });
  });
});

describe("ladeUebungInfo", () => {
  it("liefert Infos mit Vorschlag für eine Ersatzübung", () => {
    const id = start();
    const info = ladeUebungInfo(db, id, "KN-04")!;
    expect(info).toMatchObject({ id: "KN-04", name: "Goblet Squat mit Kurzhantel" });
    expect(info.vorschlag.grund).toBe("start");
    expect(ladeUebungInfo(db, id, "XX-00")).toBeNull();
    expect(ladeUebungInfo(db, 9999, "KN-04")).toBeNull();
  });
});
