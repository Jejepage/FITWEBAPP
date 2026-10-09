import { describe, expect, it } from "vitest";
import { ersetzungenFuerEinheit, ersetzungenFuerProfil, type AdHocSlot } from "./ad-hoc";
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
const profil = (key: string) => testProfile.find((p) => p.seedKey === key)!.equipment;
const basis = katalog[0] as Exercise;

/** Minimale künstliche Übung für gezielte Fälle. */
const u = (
  id: string,
  muster: Muster,
  stufe: number,
  o: { einseitig?: boolean; equipment?: EquipmentBedingung; aktiv?: boolean } = {},
): Exercise => ({
  ...basis,
  id,
  muster,
  stufe: stufe as Stufe,
  einseitig: o.einseitig ?? false,
  equipment: o.equipment ?? [],
  aktiv: o.aktiv ?? true,
});

const slot = (
  slotId: number,
  muster: Muster,
  exerciseId: string,
  block: Block = "1",
): AdHocSlot => ({
  slotId,
  block,
  muster,
  exerciseId,
});

describe("ersetzungenFuerProfil mit dem Seed-Katalog", () => {
  const ersteJeMuster = MUSTER.map((m, i) =>
    slot(i + 1, m, katalog.filter((x) => x.muster === m).sort((a, b) => b.stufe - a.stufe)[0]!.id),
  );

  it("Studio: nichts muss ersetzt werden", () => {
    const r = ersetzungenFuerProfil({
      slots: ersteJeMuster,
      uebungen: katalog,
      equipment: profil("studio"),
    });
    expect(r).toEqual({ ersetzungen: {}, fehlendeMuster: [] });
  });

  it("Unterwegs: jede Ersetzung ist aktiv, gleiches Muster und vom Profil erfüllt", () => {
    const equipment = profil("unterwegs");
    const r = ersetzungenFuerProfil({ slots: ersteJeMuster, uebungen: katalog, equipment });
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
    const r = ersetzungenFuerProfil({
      slots: [slot(1, "ZH", "ZH-01")],
      uebungen: katalog,
      equipment: profil("unterwegs"),
    });
    expect(r.ersetzungen["1"]).toBe("ZH-08");
  });
});

describe("ersetzungenFuerProfil: Auswahl des Ersatzes", () => {
  const maschine: EquipmentBedingung = [["maschinen"]];

  it("kleinster Stufenabstand zur Planübung", () => {
    const r = ersetzungenFuerProfil({
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

  it("bei gleichem Abstand gewinnt die niedrigere Stufe", () => {
    const r = ersetzungenFuerProfil({
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
    const r = ersetzungenFuerProfil({
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
    const r = ersetzungenFuerProfil({
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

  it("Planübung bleibt, wenn sie zum Profil passt", () => {
    const r = ersetzungenFuerProfil({
      slots: [slot(1, "DH", "DH-90")],
      uebungen: [u("DH-90", "DH", 3), u("DH-91", "DH", 3)],
      equipment: [],
    });
    expect(r.ersetzungen).toEqual({});
  });

  it("fehlendes Muster wird gemeldet, auch bei mehreren Slots nur einmal", () => {
    const r = ersetzungenFuerProfil({
      slots: [slot(1, "ZV", "ZV-90"), slot(2, "ZV", "ZV-90"), slot(3, "TR", "TR-90")],
      uebungen: [u("ZV-90", "ZV", 3, { equipment: maschine }), u("TR-90", "TR", 2)],
      equipment: [],
    });
    expect(r.fehlendeMuster).toEqual(["ZV"]);
    expect(r.ersetzungen).toEqual({});
  });

  it("unbekannte Planübung: Ersatz nach Stufe 2", () => {
    const r = ersetzungenFuerProfil({
      slots: [slot(1, "TR", "TR-99")],
      uebungen: [u("TR-90", "TR", 1), u("TR-91", "TR", 3)],
      equipment: [],
    });
    expect(r.ersetzungen["1"]).toBe("TR-90");
  });

  it("keine Slots: leeres Ergebnis", () => {
    expect(ersetzungenFuerProfil({ slots: [], uebungen: katalog, equipment: [] })).toEqual({
      ersetzungen: {},
      fehlendeMuster: [],
    });
  });
});

describe("ersetzungenFuerEinheit", () => {
  const eingabe = {
    slots: [slot(1, "KN", "KN-90", "1"), slot(2, "TR", "TR-90", "Z")],
    uebungen: [
      u("KN-90", "KN", 3, { equipment: [["maschinen"]] }),
      u("KN-91", "KN", 2),
      u("TR-90", "TR", 2, { equipment: [["maschinen"]] }),
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
