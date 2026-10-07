import { describe, expect, it } from "vitest";
import { heuteIso } from "./datum";

describe("heuteIso", () => {
  it("nutzt die Zeitzone Europe/Berlin", () => {
    // 22:30 UTC am 6. Oktober ist in Berlin (MESZ, UTC+2) schon der 7. Oktober, 00:30 Uhr.
    expect(heuteIso(new Date("2026-10-06T22:30:00Z"))).toBe("2026-10-07");
    expect(heuteIso(new Date("2026-10-06T21:30:00Z"))).toBe("2026-10-06");
  });
});
