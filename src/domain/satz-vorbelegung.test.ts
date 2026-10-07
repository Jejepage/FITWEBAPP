import { describe, expect, it } from "vitest";
import { vorbelegung } from "./satz-vorbelegung";
import type { SatzWerte, Vorschlag } from "./training-types";

const vorschlag = (o: Partial<Vorschlag> = {}): Vorschlag => ({
  gewicht: null,
  wdh: 10,
  sekunden: null,
  meter: null,
  tempo: false,
  grund: "start",
  schritt: 2.5,
  ...o,
});
const satz = (o: Partial<SatzWerte> = {}): SatzWerte => ({
  gewicht: 12,
  wdh: 9,
  sekunden: null,
  meter: null,
  rpe: 8,
  tempo: false,
  ...o,
});

describe("vorbelegung", () => {
  it("erste Runde: Vorschlag, RPE vom Wochenziel", () => {
    expect(
      vorbelegung(
        { belastungsart: "wdh", vorschlag: vorschlag({ gewicht: 12.5, wdh: 8 }) },
        null,
        7,
      ),
    ).toEqual({
      gewicht: 12.5,
      wdh: 8,
      sekunden: null,
      meter: null,
      rpe: 7,
      tempo: false,
    });
  });

  it("Zeit- und Streckenübungen nehmen den passenden Messwert", () => {
    const zeit = vorbelegung(
      { belastungsart: "zeit", vorschlag: vorschlag({ wdh: null, sekunden: 30 }) },
      null,
      6,
    );
    expect(zeit).toMatchObject({ wdh: null, sekunden: 30, meter: null });
    const strecke = vorbelegung(
      { belastungsart: "strecke", vorschlag: vorschlag({ wdh: null, meter: 25, gewicht: 16 }) },
      null,
      6,
    );
    expect(strecke).toMatchObject({ wdh: null, meter: 25, gewicht: 16 });
  });

  it("Tempo-Vorschlag setzt den Schalter", () => {
    expect(
      vorbelegung({ belastungsart: "wdh", vorschlag: vorschlag({ tempo: true }) }, null, 7).tempo,
    ).toBe(true);
  });

  it("ab Runde 2: Werte der vorigen Runde statt Vorschlag, auch RPE", () => {
    const w = vorbelegung(
      { belastungsart: "wdh", vorschlag: vorschlag({ gewicht: 20, wdh: 8 }) },
      satz(),
      7,
    );
    expect(w).toEqual(satz());
  });

  it("liefert eine Kopie der vorigen Runde (keine geteilte Referenz)", () => {
    const vorige = satz();
    const w = vorbelegung({ belastungsart: "wdh", vorschlag: vorschlag() }, vorige, 7);
    w.wdh = 1;
    expect(vorige.wdh).toBe(9);
  });
});
