import { describe, expect, it } from "vitest";
import { erfuellt } from "./equipment";
import { generierePlan, kandidatenFuerSlot, pruefePlan } from "./generator";
import {
  SLOT_VORLAGE,
  slotKey,
  type GeneratorEingabe,
  type SlotKey,
  type SlotZuordnung,
} from "./plan-types";
import { testKatalog, testProfile } from "./test-katalog";
import { MUSTER, type Einheit, type EquipmentArt, type Exercise, type Muster } from "./types";

/** Katalog mit den Ersatz-Kennzeichen des Seeds. */
const ECHTER_KATALOG = testKatalog();
/** Derselbe Katalog ohne Ersatz-Kennzeichen: prüft die reine Stufenlogik. */
const KATALOG = ECHTER_KATALOG.map((u) => ({ ...u, ersatz: false }));
const KATALOGE = [
  ["ohne Ersatzkennzeichen", KATALOG],
  ["mit Ersatzkennzeichen", ECHTER_KATALOG],
] as const;
const STUFEN = [1, 2, 3, 4, 5];
const SEEDS = Array.from({ length: 10 }, (_, i) => i);
const KN_HB: readonly Muster[] = ["KN", "HB"];

const einheitlich = (stufe: number): Record<Muster, number> =>
  Object.fromEntries(MUSTER.map((m) => [m, stufe])) as Record<Muster, number>;

const equipmentVon = (seedKey: string): EquipmentArt[] => {
  const profil = testProfile.find((p) => p.seedKey === seedKey);
  if (!profil) throw new Error(`Profil ${seedKey} fehlt`);
  return profil.equipment;
};

const eingabe = (
  seedKey: string,
  stufen: Record<Muster, number>,
  extra: Partial<GeneratorEingabe> = {},
): GeneratorEingabe => ({
  uebungen: KATALOG,
  equipment: equipmentVon(seedKey),
  stufen,
  ...extra,
});

function plan(e: GeneratorEingabe) {
  const r = generierePlan(e);
  if (!r.ok) throw new Error(`Muster fehlen: ${r.fehlendeMuster.join(", ")}`);
  return r;
}

const idVon = (slots: readonly SlotZuordnung[], einheit: Einheit, muster: Muster) =>
  slots.find((s) => s.einheit === einheit && s.muster === muster)?.exerciseId;

const ids = (slots: readonly SlotZuordnung[], muster: Muster) => [
  idVon(slots, "A", muster),
  idVon(slots, "B", muster),
];

/** Rang unabhängig von der Implementierung: Index in [L, L-1, …, 1, L+1, …, 5]. */
function rang(stufe: number, wunsch: number): number {
  const reihenfolge = [
    ...STUFEN.filter((s) => s <= wunsch).reverse(),
    ...STUFEN.filter((s) => s > wunsch),
  ];
  return reihenfolge.indexOf(stufe);
}

const ohneEinseitigKnHb = KATALOG.filter((u) => !(KN_HB.includes(u.muster) && u.einseitig));
const deaktiviere = (liste: readonly string[]): Exercise[] =>
  KATALOG.map((u) => (liste.includes(u.id) ? { ...u, aktiv: false } : u));

/** Sortierschlüssel wie im Generator: Planübungen (0) vor Ersatzübungen (10), darin der Stufenrang. */
const schluessel = (u: Exercise, wunsch: number): number =>
  (u.ersatz ? 10 : 0) + rang(u.stufe, wunsch);

/** Prüft alle Eigenschaften, die für jeden erzeugten Plan gelten müssen. */
function pruefeEigenschaften(e: GeneratorEingabe): SlotZuordnung[] {
  const { slots, hinweise } = plan(e);
  const nachId = new Map(e.uebungen.map((u) => [u.id, u]));

  expect(slots.map((s) => [s.einheit, s.block, s.position, s.muster])).toEqual(
    SLOT_VORLAGE.map((s) => [s.einheit, s.block, s.position, s.muster]),
  );
  for (const s of slots) {
    const u = nachId.get(s.exerciseId);
    expect(u, s.exerciseId).toBeDefined();
    expect(u?.muster).toBe(s.muster);
    expect(u?.aktiv).toBe(true);
    expect(erfuellt(u?.equipment ?? [["keins"]], e.equipment)).toBe(true);
  }

  const einseitigKnHb = slots.filter(
    (s) => KN_HB.includes(s.muster) && nachId.get(s.exerciseId)?.einseitig,
  );
  const abweichend: SlotZuordnung[] = [];
  for (const muster of MUSTER) {
    const kand = kandidatenFuerSlot(e, muster);
    const raenge = kand.map((u) => schluessel(u, e.stufen[muster]));
    expect(raenge).toEqual([...raenge].sort((x, y) => x - y));
    const beste = raenge[0] ?? -1;
    const zweite = raenge[1] ?? beste;

    const [idA, idB] = ids(slots, muster);
    if (kand.length >= 2) expect(idA, muster).not.toBe(idB);
    else expect(idA, muster).toBe(idB);

    const grenzen = [
      ["A", beste],
      ["B", zweite],
    ] as const;
    for (const [einheit, grenze] of grenzen) {
      const slot = slots.find((s) => s.einheit === einheit && s.muster === muster);
      const u = nachId.get(slot?.exerciseId ?? "");
      if (!slot || !u) throw new Error("Slot fehlt");
      if (schluessel(u, e.stufen[muster]) > grenze) abweichend.push(slot);

      // Abwechslung nur innerhalb gleicher Stufe: benutzte Übung nur, wenn keine unbenutzte
      // gleichen Rangs (außer der Übung der anderen Einheit) bereitsteht.
      // Das Muster mit dem per Einseitig-Regel eingesetzten Slot (einziger einseitiger in
      // KN/HB) ist ausgenommen: der Austausch kann die unbenutzte Übung verdrängen.
      const eingesetzt = einseitigKnHb.length === 1 && einseitigKnHb[0]?.muster === muster;
      if (e.vorherVerwendet?.has(u.id) && !eingesetzt) {
        const andere = einheit === "A" ? idB : idA;
        const besser = kand.find(
          (k) =>
            schluessel(k, e.stufen[muster]) === schluessel(u, e.stufen[muster]) &&
            !e.vorherVerwendet?.has(k.id) &&
            k.id !== andere,
        );
        expect(besser?.id, `${einheit}-${muster}`).toBeUndefined();
      }
    }
  }

  // Abweichung vom Rang ist nur durch den einen Einseitig-Austausch in KN/HB erlaubt.
  expect(abweichend.length).toBeLessThanOrEqual(1);
  for (const s of abweichend) {
    expect(KN_HB).toContain(s.muster);
    expect(einseitigKnHb.map(slotKey)).toEqual([slotKey(s)]);
  }

  const gibtEinseitige = KN_HB.some((m) => kandidatenFuerSlot(e, m).some((u) => u.einseitig));
  if (gibtEinseitige) expect(einseitigKnHb.length).toBeGreaterThan(0);

  expect(hinweise).toEqual(
    pruefePlan(slots, { uebungen: e.uebungen, equipment: e.equipment, stufen: e.stufen }),
  );
  return slots;
}

describe("generierePlan: Eigenschaften über den echten Katalog", () => {
  for (const [katName, uebungen] of KATALOGE) {
    for (const profil of testProfile) {
      it(`${profil.name} (${katName}): Stufen 1 bis 5 × Seeds 0 bis 9`, () => {
        for (const stufe of STUFEN) {
          for (const seed of SEEDS) {
            pruefeEigenschaften(eingabe(profil.seedKey, einheitlich(stufe), { uebungen, seed }));
          }
        }
      });

      it(`${profil.name} (${katName}): gemischte Stufen pro Muster`, () => {
        const stufen = { KN: 1, HB: 4, DH: 2, DV: 3, ZH: 5, ZV: 2, TR: 1, RU: 3 };
        for (const seed of SEEDS) {
          pruefeEigenschaften(eingabe(profil.seedKey, stufen, { uebungen, seed }));
        }
      });

      it(`${profil.name} (${katName}): Folgeblock mit vorherVerwendet über Stufen und Seeds`, () => {
        for (const stufe of STUFEN) {
          const erster = plan(eingabe(profil.seedKey, einheitlich(stufe), { uebungen }));
          const vorher = new Set(erster.slots.map((s) => s.exerciseId));
          for (const seed of SEEDS) {
            pruefeEigenschaften(
              eingabe(profil.seedKey, einheitlich(stufe), {
                uebungen,
                vorherVerwendet: vorher,
                seed,
              }),
            );
          }
        }
      });
    }
  }

  it("gemischte Stufen im Studio: konkrete Belegung", () => {
    const stufen = { KN: 1, HB: 4, DH: 2, DV: 3, ZH: 5, ZV: 2, TR: 1, RU: 3 };
    const { slots, hinweise } = plan(eingabe("studio", stufen));
    expect(ids(slots, "KN")).toEqual(["KN-01", "KN-02"]);
    expect(ids(slots, "HB")).toEqual(["HB-09", "HB-06"]);
    expect(ids(slots, "DH")).toEqual(["DH-03", "DH-04"]);
    expect(ids(slots, "DV")).toEqual(["DV-05", "DV-06"]);
    expect(ids(slots, "ZH")).toEqual(["ZH-06", "ZH-07"]);
    expect(ids(slots, "ZV")).toEqual(["ZV-03", "ZV-04"]);
    expect(ids(slots, "TR")).toEqual(["TR-01", "TR-02"]);
    expect(ids(slots, "RU")).toEqual(["RU-06", "RU-07"]);
    expect(hinweise.map((h) => [h.code, h.muster, h.gewuenscht, h.tatsaechlich])).toEqual([
      ["stufe_weicht_ab", "KN", 1, 2],
      ["stufe_weicht_ab", "HB", 4, 3],
      ["stufe_weicht_ab", "ZH", 5, 3],
    ]);
  });

  it("ist bei gleichem Seed deterministisch; Seed 0 und fehlender Seed sind gleich", () => {
    const e = (seed?: number) =>
      eingabe("studio", einheitlich(2), seed === undefined ? {} : { seed });
    for (const seed of SEEDS) expect(generierePlan(e(seed))).toEqual(generierePlan(e(seed)));
    expect(generierePlan(e(0))).toEqual(generierePlan(e()));
  });

  it("liefert über die Seeds 1 bis 9 mindestens zwei verschiedene Pläne", () => {
    for (const key of ["studio", "zuhause"]) {
      const plaene = new Set(
        SEEDS.slice(1).map((seed) =>
          JSON.stringify(generierePlan(eingabe(key, einheitlich(2), { seed }))),
        ),
      );
      expect(plaene.size, key).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("generierePlan: konkrete Fälle", () => {
  it("Unterwegs/ZH: nur ZH-07, beide Einheiten gleich, Hinweis wenig_auswahl", () => {
    const { slots, hinweise } = plan(eingabe("unterwegs", einheitlich(2)));
    expect(ids(slots, "ZH")).toEqual(["ZH-07", "ZH-07"]);
    expect(hinweise).toContainEqual({ code: "wenig_auswahl", muster: "ZH" });
    expect(hinweise.filter((h) => h.code === "gleiche_uebung_ab")).toEqual([]);
  });

  it("Zuhause, alle Stufen 2: KN = {KN-03, KN-04}, Einseitig durch HB-03 ohne Austausch", () => {
    const { slots, hinweise } = plan(eingabe("zuhause", einheitlich(2)));
    expect(ids(slots, "KN")).toEqual(["KN-03", "KN-04"]);
    // HB-Kandidaten Stufe 2: HB-03 (einseitig), HB-04, HB-05; nach ID gewinnt HB-03.
    expect(ids(slots, "HB")).toEqual(["HB-03", "HB-04"]);
    expect(hinweise.map((h) => h.code)).not.toContain("einseitig_fehlt");
    expect(hinweise.map((h) => h.muster)).toEqual(["ZV", "RU"]); // Stufe 1 als Rückfall
  });

  it("Zuhause, Stufe 4 für HB: A = HB-09, B fällt auf Stufe 3 (HB-06) zurück", () => {
    const { slots, hinweise } = plan(eingabe("zuhause", { ...einheitlich(2), HB: 4 }));
    expect(ids(slots, "HB")).toEqual(["HB-09", "HB-06"]);
    expect(hinweise).toContainEqual({
      code: "stufe_weicht_ab",
      muster: "HB",
      gewuenscht: 4,
      tatsaechlich: 3,
    });
  });

  it("Equipment [] liefert ok: false mit fehlendem ZV", () => {
    const r = generierePlan({ uebungen: KATALOG, equipment: [], stufen: einheitlich(2) });
    expect(r).toEqual({ ok: false, fehlendeMuster: ["ZV"] });
  });

  it("Studio Stufe 5 ZV: A = ZV-07, B = ZV-06", () => {
    const { slots } = plan(eingabe("studio", einheitlich(5)));
    expect(ids(slots, "ZV")).toEqual(["ZV-07", "ZV-06"]);
  });

  it("Einseitig-Regel: HB-03 (Stufenrang 1) schlägt KN-05 (Rang 2); verdrängt wird die schlechtere Übung (HB-B)", () => {
    // Stufe 1: HB-01 (A) und HB-02 (B); HB-03 ist die nächstbeste einseitige Übung.
    const { slots } = plan(eingabe("studio", einheitlich(1)));
    expect(ids(slots, "HB")).toEqual(["HB-01", "HB-03"]);
    expect(ids(slots, "KN")).toEqual(["KN-01", "KN-02"]);
  });

  it("Einseitig-Regel: kommt HB nicht in Frage, wird die schlechtere KN-Übung (B) ersetzt", () => {
    const uebungen = KATALOG.filter((u) => !(u.muster === "HB" && u.einseitig));
    const { slots } = plan({ ...eingabe("studio", einheitlich(1)), uebungen });
    expect(ids(slots, "HB")).toEqual(["HB-01", "HB-02"]);
    expect(ids(slots, "KN")).toEqual(["KN-01", "KN-05"]);
  });

  it("Einseitig-Regel vergleicht den Stufenrang, nicht die Listenposition (KN 2, HB 3)", () => {
    // Beide einseitigen Kandidaten stehen in ihrer Liste an derselben Position (Index 4),
    // HB-03 hat aber Rang 1 (Stufe 2 bei Wunsch 3), KN-05 Rang 2 (Stufe 3 bei Wunsch 2).
    const stufen = { ...einheitlich(2), HB: 3 };
    const { slots } = plan(eingabe("studio", stufen));
    expect(ids(slots, "HB")).toEqual(["HB-06", "HB-03"]);
    expect(ids(slots, "KN")).toEqual(["KN-02", "KN-03"]);
  });

  it("Einseitig-Entscheidung hängt nicht vom Seed ab: KN 1, HB 1 ersetzt immer in HB", () => {
    for (let seed = 0; seed <= 20; seed++) {
      const { slots } = plan({ ...eingabe("studio", einheitlich(1)), seed });
      const einseitigeIds = new Set(KATALOG.filter((u) => u.einseitig).map((u) => u.id));
      const einseitig = slots.filter(
        (s) => KN_HB.includes(s.muster) && einseitigeIds.has(s.exerciseId),
      );
      expect(
        einseitig.map((s) => s.muster),
        `Seed ${seed}`,
      ).toEqual(["HB"]);
    }
  });

  it("ohne einseitige KN/HB-Kandidaten bleibt es bei Regel 4 und es gibt einen Hinweis", () => {
    const r = plan({ ...eingabe("studio", einheitlich(2)), uebungen: ohneEinseitigKnHb });
    expect(ids(r.slots, "KN")).toEqual(["KN-02", "KN-03"]);
    expect(ids(r.slots, "HB")).toEqual(["HB-02", "HB-04"]);
    expect(r.hinweise).toEqual([{ code: "einseitig_fehlt" }]);
  });

  it("begrenzt Wunschstufen auf 1 bis 5", () => {
    const hoch = plan(eingabe("studio", einheitlich(9)));
    const fuenf = plan(eingabe("studio", einheitlich(5)));
    expect(hoch).toEqual(fuenf);
    const tief = plan(eingabe("studio", einheitlich(-3)));
    expect(tief).toEqual(plan(eingabe("studio", einheitlich(1))));
  });
});

describe("generierePlan: Ersatzübungen", () => {
  const echt = (key: string, stufe: number, extra: Partial<GeneratorEingabe> = {}) =>
    eingabe(key, einheitlich(stufe), { uebungen: ECHTER_KATALOG, ...extra });
  const ersatzIds = new Set(ECHTER_KATALOG.filter((u) => u.ersatz).map((u) => u.id));

  it("Studio und Zuhause: im Plan steht keine Ersatzübung (Stufen 1 bis 5 × Seeds)", () => {
    for (const key of ["studio", "zuhause"]) {
      for (const stufe of STUFEN) {
        for (const seed of SEEDS) {
          const { slots } = plan(echt(key, stufe, { seed }));
          const ersatz = slots.map((s) => s.exerciseId).filter((id) => ersatzIds.has(id));
          expect(ersatz, `${key} Stufe ${stufe} Seed ${seed}`).toEqual([]);
        }
      }
    }
  });

  it("Zuhause Stufe 2: Goblet Squat statt Kniebeuge mit Körpergewicht", () => {
    const { slots } = plan(echt("zuhause", 2));
    expect(idVon(slots, "A", "KN")).toBe("KN-04");
    expect(ids(slots, "KN")).not.toContain("KN-03");
  });

  it("Unterwegs (nur Stange): Ersatzübungen füllen auf, wo es keine Planübung gibt", () => {
    const { slots, hinweise } = plan(echt("unterwegs", 2));
    // DH hat ohne Geräte nur Liegestütz-Varianten, die als Ersatz gelten.
    expect([...ids(slots, "DH")].sort()).toEqual(["DH-02", "DH-04"]);
    // HB: eine Planübung (HB-09), B wird mit der besten Ersatzübung aufgefüllt.
    expect(ids(slots, "HB")).toEqual(["HB-09", "HB-03"]);
    // ZH: nur eine Übung überhaupt
    expect(ids(slots, "ZH")).toEqual(["ZH-07", "ZH-07"]);
    expect(hinweise).toContainEqual({ code: "wenig_auswahl", muster: "ZH" });
  });

  it("Tauschliste: Planübungen zuerst, Ersatzübungen am Ende", () => {
    const liste = kandidatenFuerSlot(echt("zuhause", 2), "KN").map((u) => u.id);
    expect(liste).toEqual(["KN-04", "KN-05", "KN-06", "KN-07", "KN-03", "KN-01"]);
  });

  it("Einseitig-Regel: eine einseitige Planübung schlägt die einseitige Ersatzübung HB-03", () => {
    const { slots } = plan(echt("studio", 2));
    const einseitig = slots
      .filter((s) => KN_HB.includes(s.muster))
      .map((s) => s.exerciseId)
      .filter((id) => ECHTER_KATALOG.find((u) => u.id === id)?.einseitig);
    expect(einseitig).toHaveLength(1);
    expect(ersatzIds.has(einseitig[0] ?? "")).toBe(false);
  });

  it("Einseitig-Regel: gibt es keine einseitige Planübung, darf es eine Ersatzübung sein", () => {
    const einseitigeAlsErsatz = ECHTER_KATALOG.map((u) =>
      u.einseitig && KN_HB.includes(u.muster) ? { ...u, ersatz: true } : u,
    );
    const { slots, hinweise } = plan({ ...echt("studio", 2), uebungen: einseitigeAlsErsatz });
    expect(ids(slots, "HB")).toContain("HB-03");
    expect(hinweise.map((h) => h.code)).not.toContain("einseitig_fehlt");
  });
});

describe("generierePlan: Folgeblock", () => {
  it("weicht bei gleichem Rang auf unbenutzte Übungen aus", () => {
    const erster = plan(eingabe("studio", einheitlich(2)));
    expect(ids(erster.slots, "DH")).toEqual(["DH-03", "DH-04"]);
    const zweiter = plan(
      eingabe("studio", einheitlich(2), {
        vorherVerwendet: new Set(erster.slots.map((s) => s.exerciseId)),
      }),
    );
    // KN Stufe 2: KN-02, KN-03 benutzt (KN-02 A, KN-03 B), KN-04 unbenutzt -> zuerst.
    expect(ids(zweiter.slots, "KN")).toEqual(["KN-04", "KN-02"]);
    expect(ids(zweiter.slots, "ZH")).toEqual(["ZH-05", "ZH-03"]);
  });

  it("wählt nie eine schlechtere Stufe nur der Abwechslung wegen", () => {
    const vorher = new Set(["DH-03", "DH-04"]); // alle Stufe-2-Kandidaten benutzt
    const { slots } = plan(eingabe("studio", einheitlich(2), { vorherVerwendet: vorher }));
    expect(ids(slots, "DH")).toEqual(["DH-03", "DH-04"]);
  });
});

describe("generierePlan: inaktive Übungen", () => {
  it("wählt nie eine inaktive Übung", () => {
    const aus = KATALOG.filter((_, i) => i % 3 === 0).map((u) => u.id);
    const uebungen = deaktiviere(aus);
    for (const profil of testProfile) {
      for (const stufe of STUFEN) {
        const r = generierePlan(
          eingabe(profil.seedKey, einheitlich(stufe), { uebungen, seed: stufe }),
        );
        if (r.ok) {
          for (const s of r.slots) expect(aus, s.exerciseId).not.toContain(s.exerciseId);
        } else {
          for (const m of r.fehlendeMuster) {
            const e = { ...eingabe(profil.seedKey, einheitlich(stufe)), uebungen };
            expect(kandidatenFuerSlot(e, m)).toEqual([]);
          }
        }
      }
    }
  });

  it("weicht auf andere Kandidaten aus, wenn die beste deaktiviert ist", () => {
    const uebungen = deaktiviere(["KN-02", "KN-03"]);
    const { slots } = plan({ ...eingabe("studio", einheitlich(2)), uebungen });
    expect(ids(slots, "KN")).toEqual(["KN-04", "KN-01"]);
  });

  it("meldet ein vollständig deaktiviertes Muster in der Reihenfolge von MUSTER", () => {
    const zh = KATALOG.filter((u) => u.muster === "ZH").map((u) => u.id);
    const kn = KATALOG.filter((u) => u.muster === "KN").map((u) => u.id);
    const e = eingabe("studio", einheitlich(2));
    expect(generierePlan({ ...e, uebungen: deaktiviere(zh) })).toEqual({
      ok: false,
      fehlendeMuster: ["ZH"],
    });
    expect(generierePlan({ ...e, uebungen: deaktiviere([...zh, ...kn]) })).toEqual({
      ok: false,
      fehlendeMuster: ["KN", "ZH"],
    });
  });
});

describe("kandidatenFuerSlot", () => {
  const kand = (
    key: string,
    stufe: number,
    muster: Muster,
    extra: Partial<GeneratorEingabe> = {},
  ) => kandidatenFuerSlot(eingabe(key, einheitlich(stufe), extra), muster).map((u) => u.id);

  it("Zuhause KN Stufe 2: Wunschstufe, dann tiefere, dann höhere; nur machbare", () => {
    expect(kand("zuhause", 2, "KN")).toEqual([
      "KN-03",
      "KN-04",
      "KN-01",
      "KN-05",
      "KN-06",
      "KN-07",
    ]);
  });

  it("Unterwegs KN Stufe 4 und Zuhause ZV Stufe 5", () => {
    expect(kand("unterwegs", 4, "KN")).toEqual(["KN-07", "KN-05", "KN-03", "KN-01"]);
    expect(kand("zuhause", 5, "ZV")).toEqual(["ZV-07", "ZV-06", "ZV-05", "ZV-04", "ZV-02"]);
  });

  it("Studio KN Stufe 2 mit vorherVerwendet: unbenutzte zuerst, aber nur innerhalb der Stufe", () => {
    expect(kand("studio", 2, "KN", { vorherVerwendet: new Set(["KN-02", "KN-05"]) })).toEqual([
      "KN-03",
      "KN-04",
      "KN-02",
      "KN-01",
      "KN-06",
      "KN-05",
      "KN-07",
      "KN-08",
    ]);
  });

  it("schließt inaktive Übungen aus", () => {
    const e = { ...eingabe("studio", einheitlich(2)), uebungen: deaktiviere(["KN-02"]) };
    expect(kandidatenFuerSlot(e, "KN").map((u) => u.id)).not.toContain("KN-02");
  });
});

describe("pruefePlan", () => {
  const e = eingabe("studio", einheitlich(2));
  const gut = plan(e).slots;

  const mit = (aenderungen: Partial<Record<SlotKey, string>>): SlotZuordnung[] =>
    gut.map((s) => ({ ...s, exerciseId: aenderungen[slotKey(s)] ?? s.exerciseId }));

  it("meldet bei einem einwandfreien Plan nichts", () => {
    expect(pruefePlan(gut, e)).toEqual([]);
  });

  it("erkennt A = B bei vorhandenen Alternativen", () => {
    expect(pruefePlan(mit({ "B-2-1": "KN-02" }), e)).toEqual([
      { code: "gleiche_uebung_ab", muster: "KN" },
    ]);
  });

  it("erkennt A = B bei nur einem Kandidaten als wenig_auswahl", () => {
    const u = eingabe("unterwegs", einheitlich(3));
    const slots = plan(u).slots;
    expect(pruefePlan(slots, u)).toContainEqual({ code: "wenig_auswahl", muster: "ZH" });
  });

  it("erkennt fehlende einseitige Übungen und sortiert den Hinweis ans Ende", () => {
    const slots = mit({ "B-1-1": "HB-02" }); // HB-B war die einseitige HB-03
    expect(pruefePlan(slots, e)).toEqual([
      { code: "gleiche_uebung_ab", muster: "HB" },
      { code: "einseitig_fehlt" },
    ]);
    const nurEinseitig = mit({ "B-1-1": "HB-04" });
    expect(pruefePlan(nurEinseitig, e)).toEqual([{ code: "einseitig_fehlt" }]);
  });

  it("erkennt Stufenabweichungen, höchstens ein Hinweis je Muster und Stufe", () => {
    expect(pruefePlan(mit({ "A-1-2": "DH-02" }), e)).toEqual([
      { code: "stufe_weicht_ab", muster: "DH", gewuenscht: 2, tatsaechlich: 1 },
    ]);
    expect(pruefePlan(mit({ "A-1-2": "DH-02", "B-1-2": "DH-01" }), e)).toEqual([
      { code: "stufe_weicht_ab", muster: "DH", gewuenscht: 2, tatsaechlich: 1 },
    ]);
    expect(pruefePlan(mit({ "A-1-2": "DH-01", "B-1-2": "DH-05" }), e)).toEqual([
      { code: "stufe_weicht_ab", muster: "DH", gewuenscht: 2, tatsaechlich: 1 },
      { code: "stufe_weicht_ab", muster: "DH", gewuenscht: 2, tatsaechlich: 3 },
    ]);
  });

  it("ordnet Hinweise nach Muster, dann nach Code", () => {
    const slots = mit({ "A-1-1": "KN-01", "B-2-1": "KN-01", "A-1-2": "DH-02" });
    expect(pruefePlan(slots, e).map((h) => [h.muster, h.code])).toEqual([
      ["KN", "gleiche_uebung_ab"],
      ["KN", "stufe_weicht_ab"],
      ["DH", "stufe_weicht_ab"],
    ]);
  });

  it("ignoriert unbekannte IDs", () => {
    const slots = mit({ "A-1-1": "XX-99", "B-2-1": "YY-01", "A-1-2": "ZZ-00" });
    expect(() => pruefePlan(slots, e)).not.toThrow();
    expect(pruefePlan(slots, e)).toEqual([]);
    expect(pruefePlan([], e)).toEqual([{ code: "einseitig_fehlt" }]);
  });
});

describe("Eingaben bleiben unverändert", () => {
  function friere<T>(wert: T): T {
    if (wert && typeof wert === "object" && !Object.isFrozen(wert)) {
      Object.freeze(wert);
      for (const v of Object.values(wert)) friere(v);
    }
    return wert;
  }

  it("generierePlan, kandidatenFuerSlot und pruefePlan mutieren nichts", () => {
    const vorher = new Set(["KN-02", "HB-03"]);
    const e = friere({
      ...eingabe("studio", einheitlich(2), { seed: 3, vorherVerwendet: vorher }),
      uebungen: friere(testKatalog()),
      equipment: friere([...equipmentVon("studio")]),
      stufen: friere(einheitlich(2)),
    });
    const schnappschuss = () => JSON.stringify([e, [...vorher]]);
    const davor = schnappschuss();

    const r = plan(e);
    friere(r.slots);
    kandidatenFuerSlot(e, "KN");
    pruefePlan(r.slots, e);
    pruefePlan(r.slots, { uebungen: e.uebungen, equipment: e.equipment, stufen: e.stufen });
    expect(schnappschuss()).toBe(davor);
  });
});
