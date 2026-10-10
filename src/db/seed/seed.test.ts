import { eq, sql } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { exerciseSeedSchema } from "@/domain/schemas";
import { istStandardYoutubeUrl } from "@/domain/youtube";
import {
  EQUIPMENT_ARTEN,
  MUSTER,
  type EquipmentArt,
  type EquipmentBedingung,
} from "@/domain/types";
import { PROJEKT_ROOT, neueDb } from "../test-utils";
import { exercise, settings } from "../schema";
import { uebungenSeed } from "./data";
import { seed } from "./run";

const byId = new Map(uebungenSeed.map((u) => [u.id, u]));

describe("Seed-Daten", () => {
  it("enthält 76 Übungen mit eindeutigen IDs", () => {
    expect(uebungenSeed).toHaveLength(76);
    expect(byId.size).toBe(76);
  });

  it("Anzahl je Muster stimmt mit der Spec überein", () => {
    const soll = { KN: 12, HB: 14, DH: 7, DV: 8, ZH: 8, ZV: 7, TR: 11, RU: 9 };
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

  it("verwendet nur bekannte Equipment-Arten, jede höchstens einmal", () => {
    for (const u of uebungenSeed) {
      for (const art of u.equipment) expect(EQUIPMENT_ARTEN).toContain(art);
      expect(new Set(u.equipment).size, u.id).toBe(u.equipment.length);
    }
  });

  it("keine Namen doppelt (Varianten heißen nach ihrem Gerät)", () => {
    const namen = uebungenSeed.map((u) => u.name);
    expect(new Set(namen).size).toBe(namen.length);
  });

  it("Zeit- und Streckenübungen haben passende Bereichseinheit", () => {
    for (const u of uebungenSeed) {
      const einheit = u.standardBereich.match(/ (s|m)$/)?.[1];
      const soll = { wdh: undefined, zeit: "s", strecke: "m" }[u.belastungsart];
      expect(einheit, u.id).toBe(soll);
    }
  });

  it("'gewicht' als Steigerung nur bei beladbaren Übungen, 'stufe' nur mit schwererer Übung", () => {
    const beladbar = (eq: EquipmentBedingung) =>
      eq.some(
        (a) =>
          a === "maschinen" ||
          a === "kabelzug" ||
          a === "langhantel" ||
          a === "kurzhanteln" ||
          a === "kettlebell",
      );
    // Last ist ein Alltagsgegenstand (Rucksack bzw. Tasche), das Gewicht wird darin variiert.
    const alltagslast = new Set(["TR-01", "TR-07", "ZV-07"]);
    for (const u of uebungenSeed) {
      if (u.steigerungsart.includes("gewicht") && !alltagslast.has(u.id)) {
        expect(beladbar(u.equipment), `${u.id} gewicht`).toBe(true);
      }
      if (u.steigerungsart.includes("stufe")) {
        expect(u.schwererId, `${u.id} stufe`).not.toBeNull();
      }
    }
  });

  it("jede Übung hat einen YouTube-Link in Standardform, doppelt nur bei Varianten", () => {
    for (const u of uebungenSeed) {
      expect(u.videoUrl, u.id).not.toBeNull();
      expect(istStandardYoutubeUrl(u.videoUrl!), `${u.id} ${u.videoUrl}`).toBe(true);
    }
    // Varianten derselben Übung (anderes Gerät, mit/ohne Gewicht) teilen sich das Video.
    const VARIANTEN: [string, string][] = [
      ["KN-04", "KN-09"],
      ["KN-05", "KN-10"],
      ["KN-06", "KN-11"],
      ["KN-07", "KN-12"],
      ["HB-07", "HB-11"],
      ["HB-07", "HB-12"],
      ["HB-10", "HB-13"],
      ["HB-09", "HB-14"],
      ["TR-02", "TR-08"],
      ["TR-04", "TR-09"],
      ["TR-05", "TR-10"],
      ["TR-06", "TR-11"],
      ["RU-05", "RU-09"],
    ];
    const zweitvariante = new Set(VARIANTEN.map(([, v]) => v));
    for (const [a, b] of VARIANTEN) expect(byId.get(b)!.videoUrl, b).toBe(byId.get(a)!.videoUrl);
    const links = uebungenSeed.filter((u) => !zweitvariante.has(u.id)).map((u) => u.videoUrl);
    expect(new Set(links).size).toBe(links.length);
  });
});

describe("Ersatzübungen im Seed", () => {
  it("kennzeichnet reines Körpergewicht und Band-Übungen, Übungen mit Gerät bleiben Planübungen", () => {
    const ersatz = uebungenSeed.filter((u) => u.ersatz).map((u) => u.id);
    expect(ersatz).toEqual([
      "KN-01", "KN-03", "KN-05", "KN-07", "KN-11",
      "HB-01", "HB-03", "HB-09", "HB-10",
      "DH-02", "DH-04", "DH-07",
      "DV-02", "DV-03", "DV-07", "DV-08",
      "ZH-02", "ZH-07", "ZH-08",
      "TR-01", "TR-03", "TR-07",
      "RU-01", "RU-02", "RU-03", "RU-04", "RU-06", "RU-09",
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
    KZ: "kabelzug",
    LH: "langhantel",
    KH: "kurzhanteln",
    KB: "kettlebell",
    BK: "bank",
    ST: "stange",
    BD: "band",
  };

  function parseEquipment(zelle: string): EquipmentBedingung {
    if (zelle.trim() === "–") return [];
    return zelle.split(" + ").map((a) => {
      const art = ABK[a.trim()];
      if (!art) throw new Error(`Unbekannte Equipment-Abkürzung "${a}" in Zelle "${zelle}"`);
      return art;
    });
  }

  const text = readFileSync(join(PROJEKT_ROOT, "docs/SPEC.md"), "utf8");
  const zeilen = [
    ...text.matchAll(
      /^\| ((?:KN|HB|DH|DV|ZH|ZV|TR|RU)-\d{2}) \| (.+?) \| (.+?) \| (\d) \| (ja)? ?\|$/gm,
    ),
  ];

  it("findet alle 76 Zeilen in der Spec", () => {
    expect(zeilen).toHaveLength(76);
  });

  it.each(zeilen.map((m) => [m[1]!, m] as const))("%s stimmt mit der Spec überein", (id, m) => {
    const u = byId.get(id)!;
    expect(u, id).toBeDefined();
    expect(u.name).toBe(m[2]);
    expect(u.stufe).toBe(Number(m[4]));
    expect(u.einseitig).toBe(m[5] === "ja");
    expect(u.equipment).toEqual(parseEquipment(m[3]!));
  });
});

describe("Seed-Runner", () => {
  let db: ReturnType<typeof neueDb>;
  beforeEach(() => {
    db = neueDb();
  });

  it("legt Katalog und eine Settings-Zeile an", () => {
    seed(db);
    expect(db.select().from(exercise).all()).toHaveLength(76);
    const s = db.select().from(settings).all();
    expect(s).toHaveLength(1);
    expect(s[0]!.einheitenProWoche).toBe(2);
    expect(Object.values(s[0]!.stufen)).toEqual(Array(8).fill(2));
  });

  it("ist idempotent und überschreibt keine Nutzeränderungen", () => {
    seed(db);
    db.update(exercise)
      .set({ name: "Meine Kniebeuge", aktiv: false, pruefstatus: "geprueft", ersatz: true })
      .where(eq(exercise.id, "KN-04"))
      .run();
    db.update(settings).set({ einheitenProWoche: 3 }).where(eq(settings.id, 1)).run();
    seed(db);
    expect(db.select().from(exercise).all()).toHaveLength(76);
    const kn04 = db.select().from(exercise).where(eq(exercise.id, "KN-04")).get()!;
    expect(kn04).toMatchObject({
      name: "Meine Kniebeuge",
      aktiv: false,
      pruefstatus: "geprueft",
      ersatz: true,
    });
    expect(db.select().from(settings).get()!.einheitenProWoche).toBe(3);
  });

  it("legt keine Equipment-Profile mehr an (das Equipment gehört zum Plan)", () => {
    seed(db);
    const tabellen = db
      .all<{ name: string }>(sql`select name from sqlite_master where type = 'table'`)
      .map((t) => t.name);
    expect(tabellen).not.toContain("equipment_profile");
  });

  it("speichert Seed-Übungen als 'zu prüfen' und aktiv; Listen bleiben als Listen lesbar", () => {
    seed(db);
    const alle = db.select().from(exercise).all();
    expect(alle.every((e) => e.pruefstatus === "zu_pruefen" && e.aktiv && e.bild === null)).toBe(
      true,
    );
    const hipThrust = alle.find((e) => e.id === "HB-07")!;
    expect(hipThrust.equipment).toEqual(["kurzhanteln", "bank"]);
    expect(Array.isArray(hipThrust.ausfuehrung)).toBe(true);
  });
});
