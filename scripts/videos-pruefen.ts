// Prüft die YouTube-Links des Katalogs: Gibt es das Video noch, und wie heißen Titel und Kanal?
// Grundlage ist der Seed oder ein Katalog-Export der App (Einstellungen → Daten → Katalog exportieren).
//   npm run katalog:videos-pruefen -- [Katalog-Export.json] [Zieldatei]   (Standard: Seed, video-pruefung.md)
// Braucht Internetzugang zu youtube.com. Ergebnis: Markdown-Tabelle, sortiert nach Übungs-ID.
import { readFileSync, writeFileSync } from "node:fs";
import { uebungenSeed } from "../src/db/seed/data";

type Eintrag = { id: string; name: string; videoUrl?: string | null };

const quelle = process.argv[2];
const ziel = process.argv[3] ?? "video-pruefung.md";

const uebungen: Eintrag[] = quelle
  ? (JSON.parse(readFileSync(quelle, "utf8")) as { daten: { uebungen: Eintrag[] } }).daten.uebungen
  : uebungenSeed;

type Ergebnis = { status: string; titel: string; kanal: string };

async function pruefe(url: string): Promise<Ergebnis> {
  const api = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
  try {
    const res = await fetch(api);
    if (res.ok) {
      const d = (await res.json()) as { title?: string; author_name?: string };
      return { status: "ok", titel: d.title ?? "", kanal: d.author_name ?? "" };
    }
    // 401/403: Video existiert, Einbetten ist gesperrt (der Link funktioniert trotzdem).
    if (res.status === 401 || res.status === 403) return { status: "ok (nicht einbettbar)", titel: "", kanal: "" };
    return { status: `FEHLT (${res.status})`, titel: "", kanal: "" };
  } catch (e) {
    return { status: `Netzwerkfehler: ${(e as Error).message}`, titel: "", kanal: "" };
  }
}

const cache = new Map<string, Ergebnis>();
const zeilen: string[] = [];
let fehlend = 0;
for (const u of [...uebungen].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
  if (!u.videoUrl) {
    zeilen.push(`| ${u.id} | ${u.name} | – | KEIN LINK | | |`);
    fehlend++;
    continue;
  }
  let r = cache.get(u.videoUrl);
  if (!r) {
    r = await pruefe(u.videoUrl);
    cache.set(u.videoUrl, r);
  }
  if (!r.status.startsWith("ok")) fehlend++;
  const esc = (s: string) => s.replaceAll("|", "\\|");
  zeilen.push(`| ${u.id} | ${u.name} | ${u.videoUrl} | ${r.status} | ${esc(r.titel)} | ${esc(r.kanal)} |`);
}

const text = [
  `# Video-Prüfung (${new Date().toISOString().slice(0, 10)}, Quelle: ${quelle || "Seed"})`,
  "",
  "| ID | Übung | Link | Status | Titel | Kanal |",
  "|---|---|---|---|---|---|",
  ...zeilen,
  "",
].join("\n");
writeFileSync(ziel, text);
console.log(`${uebungen.length} Übungen geprüft, ${fehlend} ohne funktionierenden Link. Ergebnis: ${ziel}`);
