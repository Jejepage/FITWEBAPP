import { describe, expect, it } from "vitest";
import { ersetzungenFuerEinheit, ersetzungenFuerEquipment, type ErsetzSlot } from "./ersetzungen";
import { erfuellt } from "./equipment";
import { testKatalog, testProfile } from "./test-katalog";
import {
  MUSTER,
  type EquipmentBedingung,
  type Exercise,
  type Block,
  type Muster,
  type Stufe,
} from "./types";

const katalog = testKatalog();
const equipmentVon = (key: string) => testProfile.find((p) => p.seedKey === key)!.equipment;
const basis = katalog[0] as Exercise;

/** Minimale künstliche Übung für gezielte Fälle. */
const u = (
  id: string,
  muster: Muster,
  stufe: number,
  o: {
    einseitig?: boolean;
    equipment?: EquipmentBedingung;
    aktiv?: boolean;
    ersatz?: boolean;
    videoUrl?: string;
  } = {},
): Exercise => ({
  ...basis,
  id,
  muster,
  stufe: stufe as Stufe,
  einseitig: o.einseitig ?? false,
  equipment: o.equipment ?? [],
  aktiv: o.aktiv ?? true,
  ersatz: o.ersatz ?? false,
  videoUrl: o.videoUrl ?? null,
});

const slot = (
  slotId: number,
  muster: Muster,
  exerciseId: string,
  block: Block = "1",
): ErsetzSlot => ({
  slotId,
  block,
  muster,
  exerciseId,
});

describe("ersetzungenFuerEquipment mit dem Seed-Katalog", () => {
  const ersteJeMuster = MUSTER.map((m, i) =>
    slot(i + 1, m, katalog.filter((x) => x.muster === m).sort((a, b) => b.stufe - a.stufe)[0]!.id),
  );

  it("Studio-Equipment: nichts muss ersetzt werden", () => {
    const r = ersetzungenFuerEquipment({
      slots: ersteJeMuster,
      uebungen: katalog,
      equipment: equipmentVon("studio"),
    });
    expect(r).toEqual({ ersetzungen: {}, fehlendeMuster: [] });
  });

  it("Unterwegs: jede Ersetzung ist aktiv, gleiches Muster und vom Equipment erfüllt", () => {
    const equipment = equipmentVon("unterwegs");
    const r = ersetzungenFuerEquipment({ slots: ersteJeMuster, uebungen: katalog, equipment });
    expect(r.fehlendeMuster).toEqual([]);
    for (const [slotId, id] of Object.entries(r.ersetzungen)) {
      const s = ersteJeMuster.find((x) => String(x.slotId) === slotId)!;
      const ersatz = katalog.find((x) => x.id === id)!;
      expect(ersatz.muster).toBe(s.muster);
      expect(ersatz.aktiv).toBe(true);
      expect(erfuellt(ersatz.equipment, equipment)).toBe(true);
    }
    // Slots, deren Planübung auch unterwegs geht, bleiben unverändert
    for (const s of ersteJeMuster) {
      const orig = katalog.find((x) => x.id === s.exerciseId)!;
      if (erfuellt(orig.equipment, equipment))
        expect(r.ersetzungen[String(s.slotId)]).toBeUndefined();
    }
  });

  it("Unterwegs: Kabelrudern wird zum Türrahmen-Rudern (gleiche Stufe 1)", () => {
    const r = ersetzungenFuerEquipment({
      slots: [slot(1, "ZH", "ZH-01")],
      uebungen: katalog,
      equipment: equipmentVon("unterwegs"),
    });
    expect(r.ersetzungen["1"]).toBe("ZH-08");
  });
});

describe("ersetzungenFuerEquipment: Auswahl des Ersatzes", () => {
  const maschine: EquipmentBedingung = ["maschinen"];

  it("kleinster Stufenabstand zur Planübung", () => {
    const r = ersetzungenFuerEquipment({
      slots: [slot(1, "KN", "KN-90")],
      uebungen: [
        u("KN-90", "KN", 4, { equipment: maschine }),
        u("KN-91", "KN", 1),
        u("KN-92", "KN", 3),
      ],
      equipment: [],
    });
    expect(r.ersetzungen["1"]).toBe("KN-92");
  });

  it("eine Planübung schlägt eine Ersatzübung, auch wenn die Ersatzübung näher an der Stufe liegt", () => {
    const r = ersetzungenFuerEquipment({
      slots: [slot(1, "KN", "KN-90")],
      uebungen: [
        u("KN-90", "KN", 3, { equipment: maschine }),
        u("KN-91", "KN", 3, { ersatz: true }),
        u("KN-92", "KN", 1),
      ],
      equipment: [],
    });
    expect(r.ersetzungen["1"]).toBe("KN-92");
  });

  it("eine Variante der Planübung (gleiches Video) geht vor, auch bei größerem Stufenabstand", () => {
    const video = "https://www.youtube.com/watch?v=FQiMMHcWLLM";
    const r = ersetzungenFuerEquipment({
      slots: [slot(1, "KN", "KN-90")],
      uebungen: [
        u("KN-90", "KN", 2, { equipment: ["kurzhanteln"], videoUrl: video }),
        u("KN-91", "KN", 2),
        u("KN-92", "KN", 3, { equipment: ["kettlebell"], videoUrl: video }),
      ],
      equipment: ["kettlebell"],
    });
    expect(r.ersetzungen["1"]).toBe("KN-92");
  });

  it("gibt es nur Ersatzübungen, wird die ähnlichste Ersatzübung gewählt", () => {
    const r = ersetzungenFuerEquipment({
      slots: [slot(1, "KN", "KN-90")],
      uebungen: [
        u("KN-90", "KN", 3, { equipment: maschine }),
        u("KN-91", "KN", 2, { ersatz: true }),
        u("KN-92", "KN", 3, { ersatz: true }),
      ],
      equipment: [],
    });
    expect(r.ersetzungen["1"]).toBe("KN-92");
  });

  it("eine Ersatzübung, die das Equipment nicht erfüllt, ersetzt nichts", () => {
    const r = ersetzungenFuerEquipment({
      slots: [slot(1, "ZH", "ZH-90")],
      uebungen: [
        u("ZH-90", "ZH", 2, { equipment: maschine }),
        u("ZH-91", "ZH", 1, { equipment: ["band"], ersatz: true }),
      ],
      equipment: [],
    });
    expect(r).toEqual({ ersetzungen: {}, fehlendeMuster: ["ZH"] });
  });

  it("bei gleichem Abstand gewinnt die niedrigere Stufe", () => {
    const r = ersetzungenFuerEquipment({
      slots: [slot(1, "KN", "KN-90")],
      uebungen: [
        u("KN-90", "KN", 3, { equipment: maschine }),
        u("KN-91", "KN", 4),
        u("KN-92", "KN", 2),
      ],
      equipment: [],
    });
    expect(r.ersetzungen["1"]).toBe("KN-92");
  });

  it("bei gleicher Stufe gewinnt die gleiche Einseitigkeit, danach die ID", () => {
    const r = ersetzungenFuerEquipment({
      slots: [slot(1, "HB", "HB-90")],
      uebungen: [
        u("HB-90", "HB", 3, { equipment: maschine, einseitig: true }),
        u("HB-91", "HB", 2),
        u("HB-92", "HB", 2, { einseitig: true }),
        u("HB-93", "HB", 2, { einseitig: true }),
      ],
      equipment: [],
    });
    expect(r.ersetzungen["1"]).toBe("HB-92");
  });

  it("inaktive Kandidaten werden ignoriert, eine inaktive Planübung wird ersetzt", () => {
    const r = ersetzungenFuerEquipment({
      slots: [slot(1, "DH", "DH-90")],
      uebungen: [
        u("DH-90", "DH", 2, { aktiv: false }),
        u("DH-91", "DH", 2, { aktiv: false }),
        u("DH-92", "DH", 3),
      ],
      equipment: [],
    });
    expect(r.ersetzungen["1"]).toBe("DH-92");
  });

  it("Planübung bleibt, wenn sie zum Equipment passt", () => {
    const r = ersetzungenFuerEquipment({
      slots: [slot(1, "DH", "DH-90")],
      uebungen: [u("DH-90", "DH", 3), u("DH-91", "DH", 3)],
      equipment: [],
    });
    expect(r.ersetzungen).toEqual({});
  });

  it("fehlendes Muster wird gemeldet, auch bei mehreren Slots nur einmal", () => {
    const r = ersetzungenFuerEquipment({
      slots: [slot(1, "ZV", "ZV-90"), slot(2, "ZV", "ZV-90"), slot(3, "TR", "TR-90")],
      uebungen: [u("ZV-90", "ZV", 3, { equipment: maschine }), u("TR-90", "TR", 2)],
      equipment: [],
    });
    expect(r.fehlendeMuster).toEqual(["ZV"]);
    expect(r.ersetzungen).toEqual({});
  });

  it("unbekannte Planübung: Ersatz nach Stufe 2", () => {
    const r = ersetzungenFuerEquipment({
      slots: [slot(1, "TR", "TR-99")],
      uebungen: [u("TR-90", "TR", 1), u("TR-91", "TR", 3)],
      equipment: [],
    });
    expect(r.ersetzungen["1"]).toBe("TR-90");
  });

  it("keine Slots: leeres Ergebnis", () => {
    expect(ersetzungenFuerEquipment({ slots: [], uebungen: katalog, equipment: [] })).toEqual({
      ersetzungen: {},
      fehlendeMuster: [],
    });
  });
});

describe("ersetzungenFuerEinheit", () => {
  const eingabe = {
    slots: [slot(1, "KN", "KN-90", "1"), slot(2, "TR", "TR-90", "Z")],
    uebungen: [
      u("KN-90", "KN", 3, { equipment: ["maschinen"] }),
      u("KN-91", "KN", 2),
      u("TR-90", "TR", 2, { equipment: ["maschinen"] }),
    ],
    equipment: [] as const,
  };

  it("lässt den Zusatzblock weg, wenn er nicht aktiv ist (auch für fehlende Muster)", () => {
    expect(ersetzungenFuerEinheit({ ...eingabe, zusatzblock: false })).toEqual({
      ersetzungen: { "1": "KN-91" },
      fehlendeMuster: [],
    });
  });

  it("nimmt den Zusatzblock mit, wenn er aktiv ist", () => {
    expect(ersetzungenFuerEinheit({ ...eingabe, zusatzblock: true }).fehlendeMuster).toEqual([
      "TR",
    ]);
  });
});
