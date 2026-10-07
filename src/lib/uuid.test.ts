import { afterEach, describe, expect, it, vi } from "vitest";
import { neueUuid } from "./uuid";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
afterEach(() => vi.unstubAllGlobals());

describe("neueUuid", () => {
  it("nutzt crypto.randomUUID, wenn vorhanden", () => {
    expect(neueUuid()).toMatch(UUID_V4);
  });

  it("fällt ohne randomUUID (HTTP, unsicherer Kontext) auf getRandomValues zurück", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (a: Uint8Array) => {
        for (let i = 0; i < a.length; i++) a[i] = (i * 37 + 11) % 256;
        return a;
      },
    });
    const id = neueUuid();
    expect(id).toMatch(UUID_V4);
    expect(neueUuid()).toBe(id); // deterministische Testwerte
  });

  it("fällt ganz ohne crypto auf Math.random zurück und bleibt gültig und verschieden", () => {
    vi.stubGlobal("crypto", undefined);
    const ids = new Set(Array.from({ length: 50 }, () => neueUuid()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(UUID_V4);
  });

  it("erzeugt auch im Normalfall verschiedene IDs, die zum Satz-Schema passen", () => {
    const ids = new Set(Array.from({ length: 100 }, () => neueUuid()));
    expect(ids.size).toBe(100);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9-]{8,64}$/);
  });
});
