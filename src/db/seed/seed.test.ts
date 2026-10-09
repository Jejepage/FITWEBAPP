import { eq } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { exerciseSeedSchema } from "@/domain/schemas";
import {
  EQUIPMENT_ARTEN,
  MUSTER,
  type EquipmentArt,
  type EquipmentBedingung,
} from "@/domain/types";
import { PROJEKT_ROOT, neueDb } from "../test-utils";
import { equipmentProfile, exercise, settings } from "../schema";
import { uebungenSeed } from "./data";
import { seed } from "./run";

const byId = new Map(uebungenSeed.map((u) => [u.id, u]));

describe("Seed-Daten", () => {
  it("enthält 60 Übungen mit eindeutigen IDs", () => {
    expect(uebungenSeed).toHaveLength(60);
    expect(byId.size).toBe(60);
  });

  it("Anzahl je Muster stimmt mit der Spec überein", () => {
    const soll = { KN: 8, HB: 9, DH: 7, DV: 8, ZH: 7, ZV: 7, TR: 6, RU: 8 };
    for (const m of MUSTER) {
      expect(uebungenSeed.filter((u) => u.muster === m)).toHaveLength(soll[m]);
    }
  });

  it.each(uebungenSeed.map((u) => [u.id, u] as const))(
    "%s ist gültig und ihre ID passt zum Muster",
    (id, u) => {
      const r = exerciseSeedSchema.safeParse(u);
      expect(r.success, r.success ? "" : JSON.stringify(r.error.issues)).toBe(true);
      expect(id.startsWith(`${u.muster}-`)).toBe(true);
    },
  );

  it("verwendet nur bekannte Equipment-Arten (Bedingung und optionale Last)", () => {
    for (const u of uebungenSeed) {
      for (const art of [...u.equipment.flat(), ...u.optionaleLast]) {
        expect(EQUIPMENT_ARTEN).toContain(art);
      }
    }
  });

  it("Zeit- und Streckenübungen haben passende Bereichseinheit", () => {
    for (const u of uebungenSeed) {
      const einheit = u.standardBereich.match(/ (s|m)$/)?.[1];
      const soll = { wdh: undefined, zeit: "s", strecke: "m" }[u.belastungsart];
      expect(einheit, u.id).toBe(soll);
    }
  });

  it("'gewicht' als Steigerung nur bei beladbaren Übungen, 'stufe' nur mit schwererer Übung", () => {
    const beladbar = (eq: EquipmentBedingung, opt: EquipmentArt[]) =>
      opt.length > 0 ||
      eq.some((g) =>
        g.some(
          (a) =>
            a === "maschinen" || a === "langhantel" || a === "kurzhanteln" || a === "kettlebell",
        ),
      );
    for (const u of uebungenSeed) {
      // TR-01: Last ist der Rucksack selbst (Alltagsgegenstand), Gewicht wird darin variiert.
      if (u.steigerungsart.includes("gewicht") && u.id !== "TR-01") {
        expect(beladbar(u.equipment, u.optionaleLast), `${u.id} gewicht`).toBe(true);
      }
      if (u.steigerungsart.includes("stufe")) {
        expect(u.schwererId, `${u.id} stufe`).not.toBeNull();
      }
    }
  });
});

describe("Ersatzübungen im Seed", () => {
  it("kennzeichnet reines Körpergewicht und Band-Übungen, beladbare Übungen bleiben Planübungen", () => {
    const ersatz = uebungenSeed.filter((u) => u.ersatz).map((u) => u.id);
    expect(ersatz).toEqual([
      "KN-01", "KN-03",
      "HB-01", "HB-03",
      "DH-02", "DH-04", "DH-07",
      "DV-02", "DV-03", "DV-07", "DV-08",
      "ZH-02", "ZH-07",
      "TR-01", "TR-03",
      "RU-01", "RU-02", "RU-03", "RU-04", "RU-06",
    ]);
  });

  it("jedes Muster hat mindestens eine Planübung", () => {
    for (const m of MUSTER) {
      expect(uebungenSeed.some((u) => u.muster === m && !u.ersatz), m).toBe(true);
    }
  });
});

describe("Stufenleitern", () => {
  it("sind gegenseitig konsistent, im selben Muster und strikt aufsteigend", () => {
    for (const u of uebungenSeed) {
      if (u.schwererId) {
        const s = byId.get(u.schwererId);
        expect(s, `${u.id} -> ${u.schwererId}`).toBeDefined();
        expect(s!.leichterId, `${u.id} Rückverweis`).toBe(u.id);
        expect(s!.muster).toBe(u.muster);
        expect(s!.stufe).toBeGreaterThan(u.stufe);
      }
      if (u.leichterId) {
        const l = byId.get(u.leichterId);
        expect(l, `${u.id} <- ${u.leichterId}`).toBeDefined();
        expect(l!.schwererId, `${u.id} Rückverweis`).toBe(u.id);
      }
    }
  });

  it("enthalten keine Zyklen", () => {
    for (const u of uebungenSeed) {
      const gesehen = new Set<string>();
      let cur: string | null = u.id;
      while (cur) {
        expect(gesehen.has(cur), `Zyklus bei ${u.id}`).toBe(false);
        gesehen.add(cur);
        cur = byId.get(cur)?.schwererId ?? null;
      }
    }
  });

  it("enthalten die in der Spec genannten Beispielketten", () => {
    const kette = (start: string) => {
      const ids = [start];
      let cur = byId.get(start)!.schwererId;
      while (cur) {
        ids.push(cur);
        cur = byId.get(cur)!.schwererId;
      }
      return ids;
    };
    expect(kette("ZV-02")).toEqual(["ZV-02", "ZV-04", "ZV-05", "ZV-06", "ZV-07"]);
    expect(kette("DH-02")).toEqual(["DH-02", "DH-04", "DH-07"]);
  });
});

// Gleicht die Abschrift mit den Tabellen in docs/SPEC.md §4.2 ab.
describe("Abgleich mit docs/SPEC.md §4.2", () => {
  const ABK: Record<string, EquipmentArt> = {
    M: "maschinen",
    LH: "langhantel",
    KH: "kurzhanteln",
    KB: "kettlebell",
    BK: "bank",
    ST: "stange",
    BD: "band",
  };

  function parseEquipment(zelle: string): {
    equipment: EquipmentBedingung;
    optional: EquipmentArt[];
  } {
    const z = zelle.trim();
    if (z.startsWith("–") || z.startsWith("Stuhl")) {
      const optional = (z.match(/\b(KH|KB)\b/g) ?? []).map((a) => ABK[a]!);
      return { equipment: [], optional };
    }
    const gruppen = z.split(" + ").map((g) =>
      g.split(" oder ").map((a) => {
        const art = ABK[a.trim()];
        if (!art) throw new Error(`Unbekannte Equipment-Abkürzung "${a}" in Zelle "${zelle}"`);
        return art;
      }),
    );
    return { equipment: gruppen, optional: [] };
  }

  const text = readFileSync(join(PROJEKT_ROOT, "docs/SPEC.md"), "utf8");
  const zeilen = [
    ...text.matchAll(
      /^\| ((?:KN|HB|DH|DV|ZH|ZV|TR|RU)-\d{2}) \| (.+?) \| (.+?) \| (\d) \| (ja)? ?\|$/gm,
    ),
  ];

  it("findet alle 60 Zeilen in der Spec", () => {
    expect(zeilen).toHaveLength(60);
  });

  it.each(zeilen.map((m) => [m[1]!, m] as const))("%s stimmt mit der Spec überein", (id, m) => {
    const u = byId.get(id)!;
    expect(u, id).toBeDefined();
    expect(u.name).toBe(m[2]);
    expect(u.stufe).toBe(Number(m[4]));
    expect(u.einseitig).toBe(m[5] === "ja");
    const { equipment, optional } = parseEquipment(m[3]!);
    expect(u.equipment).toEqual(equipment);
    expect([...u.optionaleLast].sort()).toEqual([...optional].sort());
  });
});

describe("Seed-Runner", () => {
  let db: ReturnType<typeof neueDb>;
  beforeEach(() => {
    db = neueDb();
  });

  it("legt Katalog, drei Standardprofile und eine Settings-Zeile an", () => {
    seed(db);
    expect(db.select().from(exercise).all()).toHaveLength(60);
    const profile = db.select().from(equipmentProfile).all();
    expect(profile.map((p) => p.seedKey).sort()).toEqual(["studio", "unterwegs", "zuhause"]);
    expect(profile.find((p) => p.seedKey === "unterwegs")!.equipment).toEqual(["stange"]);
    const zuhause = profile.find((p) => p.seedKey === "zuhause")!;
    expect(zuhause.equipment.sort()).toEqual(["bank", "kettlebell", "kurzhanteln", "stange"]);
    expect(zuhause.gewichte.kurzhanteln).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
    expect(zuhause.gewichte.kettlebell).toEqual([12, 16]);
    const s = db.select().from(settings).all();
    expect(s).toHaveLength(1);
    expect(s[0]!.einheitenProWoche).toBe(2);
    expect(Object.values(s[0]!.stufen)).toEqual(Array(8).fill(2));
  });

  it("ist idempotent und überschreibt keine Nutzeränderungen", () => {
    seed(db);
    db.update(exercise)
      .set({ name: "Meine Kniebeuge", aktiv: false, pruefstatus: "geprueft" })
      .where(eq(exercise.id, "KN-03"))
      .run();
    db.update(settings).set({ einheitenProWoche: 3 }).where(eq(settings.id, 1)).run();
    seed(db);
    expect(db.select().from(exercise).all()).toHaveLength(60);
    expect(db.select().from(equipmentProfile).all()).toHaveLength(3);
    const kn03 = db.select().from(exercise).where(eq(exercise.id, "KN-03")).get()!;
    expect(kn03).toMatchObject({ name: "Meine Kniebeuge", aktiv: false, pruefstatus: "geprueft" });
    expect(db.select().from(settings).get()!.einheitenProWoche).toBe(3);
  });

  it("legt Standardprofile nur beim ersten Lauf an (gelöschte kehren nicht zurück, nur ein Standardprofil)", () => {
    seed(db);
    db.delete(equipmentProfile).where(eq(equipmentProfile.seedKey, "studio")).run();
    db.update(equipmentProfile)
      .set({ istStandard: true })
      .where(eq(equipmentProfile.seedKey, "zuhause"))
      .run();
    seed(db);
    const profile = db.select().from(equipmentProfile).all();
    expect(profile.map((p) => p.seedKey).sort()).toEqual(["unterwegs", "zuhause"]);
    expect(profile.filter((p) => p.istStandard)).toHaveLength(1);
  });

  it("speichert Seed-Übungen als 'zu prüfen' und aktiv; Listen bleiben als Listen lesbar", () => {
    seed(db);
    const alle = db.select().from(exercise).all();
    expect(alle.every((e) => e.pruefstatus === "zu_pruefen" && e.aktiv && e.bild === null)).toBe(
      true,
    );
    const goblet = alle.find((e) => e.id === "KN-04")!;
    expect(goblet.equipment).toEqual([["kurzhanteln", "kettlebell"]]);
    expect(Array.isArray(goblet.ausfuehrung)).toBe(true);
  });
});
