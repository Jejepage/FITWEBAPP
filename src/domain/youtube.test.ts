import { describe, expect, it } from "vitest";
import {
  istStandardYoutubeUrl,
  normalisiereYoutubeUrl,
  parseVideoEingabe,
  videoLink,
} from "./youtube";

const ID = "dQw4w9WgXcQ";
const STANDARD = `https://www.youtube.com/watch?v=${ID}`;

describe("normalisiereYoutubeUrl: gültige Formen", () => {
  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `http://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://music.youtube.com/watch?v=${ID}`,
    `https://www.youtube.com/watch?v=${ID}&list=PL123&index=2`,
    `https://www.youtube.com/watch?feature=share&v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abcdef`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `https://www.youtube.com/live/${ID}`,
    `https://www.youtube.com/v/${ID}`,
    `youtube.com/watch?v=${ID}`,
    `www.youtube.com/watch?v=${ID}`,
    `youtu.be/${ID}`,
    `  https://youtu.be/${ID}  `,
    `HTTPS://WWW.YOUTUBE.COM/watch?v=${ID}`,
  ])("%s → Standardform", (eingabe) => {
    expect(normalisiereYoutubeUrl(eingabe)).toEqual({ id: ID, url: STANDARD });
  });

  it("IDs mit Bindestrich und Unterstrich", () => {
    expect(normalisiereYoutubeUrl("https://youtu.be/a-b_c-d_e-f")?.id).toBe("a-b_c-d_e-f");
  });
});

describe("normalisiereYoutubeUrl: Startzeit", () => {
  it.each([
    ["t=90", 90],
    ["t=90s", 90],
    ["t=1m30s", 90],
    ["t=1h2m3s", 3723],
    ["start=45", 45],
    ["t=2m", 120],
  ])("%s → %i s", (param, sek) => {
    expect(normalisiereYoutubeUrl(`https://youtu.be/${ID}?${param}`)?.url).toBe(
      `${STANDARD}&t=${sek}s`,
    );
  });

  it.each(["t=0", "t=abc", "t=-5", "t=", "t=99999999", "t=1x"])("%s wird ignoriert", (param) => {
    expect(normalisiereYoutubeUrl(`https://youtu.be/${ID}?${param}`)?.url).toBe(STANDARD);
  });
});

describe("normalisiereYoutubeUrl: abgelehnt", () => {
  it.each([
    "",
    "   ",
    "text",
    "javascript:alert(1)",
    `javascript://www.youtube.com/watch?v=${ID}`,
    `data:text/html,https://youtu.be/${ID}`,
    `file:///etc/passwd`,
    `ftp://youtube.com/watch?v=${ID}`,
    `https://evil.example/watch?v=${ID}`,
    `https://youtube.com.evil.example/watch?v=${ID}`,
    `https://evil.example/youtube.com/watch?v=${ID}`,
    `https://youtube.com@evil.example/watch?v=${ID}`,
    `https://user:pw@youtube.com/watch?v=${ID}`,
    `https://youtube.com:8080/watch?v=${ID}`,
    `https://notyoutube.com/watch?v=${ID}`,
    `https://www.youtube.de/watch?v=${ID}`,
    `https://youtu.be.evil.example/${ID}`,
    "https://www.youtube.com/watch",
    "https://www.youtube.com/watch?v=",
    "https://www.youtube.com/watch?v=zu_kurz",
    `https://www.youtube.com/watch?v=${ID}x`,
    "https://www.youtube.com/watch?v=<script>",
    "https://www.youtube.com/playlist?list=PL12345678901",
    "https://www.youtube.com/@kanal",
    "https://www.youtube.com/channel/UC12345678901234567890",
    `https://www.youtube.com/watch/extra?v=${ID}`,
    `https://www.youtube.com/shorts/${ID}/mehr`,
    `https://youtu.be/`,
    `https://youtu.be/zu_kurz`,
    `https://${"a".repeat(300)}.youtube.com/watch?v=${ID}`,
  ])("%j wird abgelehnt", (eingabe) => {
    expect(normalisiereYoutubeUrl(eingabe)).toBeNull();
  });
});

describe("parseVideoEingabe", () => {
  it("leer oder nur Leerraum: kein Link", () => {
    expect(parseVideoEingabe("")).toEqual({ ok: true, url: null });
    expect(parseVideoEingabe("  \n ")).toEqual({ ok: true, url: null });
  });
  it("gültig: Standardform", () => {
    expect(parseVideoEingabe(`https://youtu.be/${ID}`)).toEqual({ ok: true, url: STANDARD });
  });
  it("ungültig: Fehler", () => {
    expect(parseVideoEingabe("https://example.com")).toEqual({ ok: false });
  });
});

describe("videoLink und istStandardYoutubeUrl", () => {
  it("prüft gespeicherte Werte erneut", () => {
    expect(videoLink(STANDARD)).toEqual({ id: ID, url: STANDARD });
    expect(videoLink(`https://youtu.be/${ID}`)?.url).toBe(STANDARD);
    expect(videoLink("javascript:alert(1)")).toBeNull();
    expect(videoLink(null)).toBeNull();
    expect(videoLink(undefined)).toBeNull();
    expect(videoLink("")).toBeNull();
  });
  it("Standardform erkennt nur genau diese", () => {
    expect(istStandardYoutubeUrl(STANDARD)).toBe(true);
    expect(istStandardYoutubeUrl(`${STANDARD}&t=30s`)).toBe(true);
    expect(istStandardYoutubeUrl(`https://youtu.be/${ID}`)).toBe(false);
    expect(istStandardYoutubeUrl(`${STANDARD}&list=x`)).toBe(false);
  });
});
