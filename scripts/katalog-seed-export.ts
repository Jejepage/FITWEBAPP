// Schreibt den Startkatalog aus dem Seed als Katalog-Backup (JSON). Der Seed legt beim Start nur
// fehlende Übungen an und ändert vorhandene nie; geänderte Seed-Übungen (Texte, Stufen, Video-Links)
// kommen so über „Katalog importieren“ (Einstellungen → Daten) in eine bestehende Datenbank.
// Achtung: Der Import überschreibt Übungen gleicher ID vollständig (auch Prüfstatus und aktiv).
//   npm run katalog:seed-export -- [Zieldatei]   (Standard: katalog-seed.json)
import { writeFileSync } from "node:fs";
import { uebungenSeed } from "../src/db/seed/data";
import { parseBackup } from "../src/domain/backup";
import { BACKUP_FORMAT, BACKUP_VERSION, type BackupDatei } from "../src/domain/backup-types";

const ziel = process.argv[2] ?? "katalog-seed.json";

const datei: BackupDatei = {
  format: BACKUP_FORMAT,
  version: BACKUP_VERSION,
  erstelltAm: new Date().toISOString(),
  art: "katalog",
  daten: {
    uebungen: uebungenSeed
      .map((u) => ({ ...u, bild: null, aktiv: true, pruefstatus: "zu_pruefen" as const }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  },
};

// Dieselbe Prüfung wie beim Import: eine Datei, die hier durchfällt, würde die App ablehnen.
const geprueft = parseBackup(JSON.parse(JSON.stringify(datei)), "katalog");
if (!geprueft.ok) {
  console.error(geprueft.fehler.join("\n"));
  process.exit(1);
}

writeFileSync(ziel, `${JSON.stringify(datei, null, 2)}\n`);
console.log(`${datei.daten.uebungen.length} Übungen nach ${ziel} geschrieben.`);
