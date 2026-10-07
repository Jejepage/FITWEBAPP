import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { settings } from "@/db/schema";
import { neueDb, neueSeedDb } from "@/db/test-utils";
import type { Db } from "@/db/types";
import { MUSTER } from "@/domain/types";
import { getSettings, hinweisAkzeptieren, updateSettings } from "./settings";

let db: Db;
beforeEach(() => {
  db = neueSeedDb();
});

describe("Einstellungen", () => {
  it("liefert die Standardwerte aus dem Seed", () => {
    const s = getSettings(db);
    expect(s).toMatchObject({
      einheitenProWoche: 2,
      zusatzblock: false,
      hinweisAkzeptiertAm: null,
    });
    expect(MUSTER.every((m) => s.stufen[m] === 2)).toBe(true);
    expect(s.aufwaermenText).toMatch(/Mobilisation/);
  });

  it("legt die Zeile an, wenn sie fehlt", () => {
    const leer = neueDb();
    expect(getSettings(leer).id).toBe(1);
  });

  it("speichert Änderungen", () => {
    const stufen = Object.fromEntries(MUSTER.map((m) => [m, 3])) as Record<
      (typeof MUSTER)[number],
      number
    >;
    updateSettings(db, {
      stufen: { ...stufen, KN: 1 },
      einheitenProWoche: 3,
      zusatzblock: true,
      aufwaermenText: "Neu",
    });
    const s = getSettings(db);
    expect(s).toMatchObject({ einheitenProWoche: 3, zusatzblock: true, aufwaermenText: "Neu" });
    expect(s.stufen.KN).toBe(1);
    expect(s.stufen.HB).toBe(3);
    expect(db.select().from(settings).all()).toHaveLength(1);
  });

  it("Hinweis wird einmal bestätigt und der erste Zeitpunkt bleibt erhalten", () => {
    hinweisAkzeptieren(db, new Date("2026-10-07T10:00:00Z"));
    expect(getSettings(db).hinweisAkzeptiertAm).toBe("2026-10-07T10:00:00.000Z");
    hinweisAkzeptieren(db, new Date("2027-01-01T00:00:00Z"));
    expect(getSettings(db).hinweisAkzeptiertAm).toBe("2026-10-07T10:00:00.000Z");
    expect(db.select().from(settings).where(eq(settings.id, 1)).all()).toHaveLength(1);
  });
});
