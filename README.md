# FITWEBAPP

Selbst gehostete Fitness-Webapp: Sie erstellt aus einem Übungskatalog personalisierte 6-Wochen-Trainingspläne (zwei Einheiten A/B) und begleitet das Training am Handy mit Protokoll und Steigerungsvorschlägen. Gedacht für eine Person (Erwachsene ab ca. 35, allgemeine Fitness und Kraft erhalten), die Daten bleiben auf dem eigenen Server.

Dieses Repo enthält **Phase 1** laut [docs/SPEC.md](docs/SPEC.md) (ohne Schaubilder der Übungen, ohne mehrere Nutzer).

## Funktionen

- **Übungskatalog** mit Filtern (Muster, „machbar mit meinem Equipment“, Stufe, einseitig, Ersatzübung), Stufenleitern, eigene Übungen anlegen, bearbeiten, deaktivieren
- **Equipment im Plan**: Beim Anlegen eines Plans wählst du, was du zur Verfügung hast (Geräte und Hantelgewichte); das lässt sich später ändern, z. B. nach dem Kauf eines Geräts. Einstellungen: Startstufe pro Muster, Einheiten pro Woche, Zusatzblock
- **Plan-Generator** für 6-Wochen-Blöcke mit Einheiten A und B, Slots manuell tauschbar; bevorzugt Übungen mit Equipment, **Ersatzübungen** (Körpergewicht, Band) nur als Auffüllung
- **Training durchführen**, mobil optimiert: rundenweise Sätze mit Gewicht, Wiederholungen/Zeit und RPE, Einheit unterbrechen und fortsetzen
- **Steigerung**: Vorschläge nach jeder Einheit, Stufen-Check am Blockende, „Nächsten Block erstellen"
- **Unterwegs trainieren**: Im Training lassen sich Übungen für diese Einheit tauschen, Ersatzübungen stehen immer zur Wahl; der Plan bleibt unverändert
- **Verlauf** mit Einheitenliste, Verlauf pro Übung (inkl. Diagramm) und Blockübersicht
- **Datensicherung**: Export/Import aller Daten oder nur des Katalogs als JSON

## Lokal entwickeln

Voraussetzung: Node.js ≥ 22.

```bash
npm ci
npm run dev
```

Die App läuft dann unter <http://localhost:3000>. Die SQLite-Datei liegt unter `./data/fit.db`; Migration und Seed (Startkatalog, Einstellungen) laufen beim Start automatisch. Einen anderen Pfad setzt du mit der Umgebungsvariable `DB_PATH` (siehe `.env.example`).

## Tests und Prüfungen

| Befehl | Zweck |
| --- | --- |
| `npm test` | Unit-Tests (Vitest) |
| `npm run typecheck` | TypeScript-Prüfung |
| `npm run lint` | ESLint |
| `npm run build` | Produktions-Build (Standalone) |
| `npm run e2e` | Browsertests (Playwright) gegen `next start` |

Zu `npm run e2e` (siehe `e2e/harness.mjs`):

- Vorher `npm run build` ausführen: die Tests starten die gebaute App mit `next start` auf Port 3120 (änderbar mit `E2E_PORT`).
- Jeder Test nutzt eine frische Temp-Datenbank, die lokale Daten bleiben unberührt.
- Es wird ein bereits installiertes Chromium verwendet (`playwright-core`, kein Browser-Download): Standardpfad `/opt/pw-browsers/chromium`, anderer Pfad über `CHROMIUM_PATH`. Screenshots landen in `SHOTS_DIR` (Standard: Temp-Ordner).
- Einzelne Tests: `node e2e/training.mjs` usw.
- Gestaltungsprüfung (nicht in `npm run e2e`): `node e2e/design.mjs` macht Screenshots aller Hauptseiten in Hell und Dunkel bei 390, 820, 1440 und 1920 px (`<SHOTS_DIR>/design/`) und prüft automatisch Überlauf, Tippflächen, Eingabeschrift und Textkontrast; `node e2e/design-lose.mjs` deckt Hinweis- und Anmeldeseite ab. Einschränkung per `DESIGN_SEITEN`, `DESIGN_BREITEN`, `DESIGN_SCHEMA`.
- Paralleles Arbeiten: `NEXT_DIST_DIR=.next-a` baut in einen eigenen Ordner (zusammen mit `E2E_PORT`).

## Katalog aktualisieren

Der Seed legt beim Start nur fehlende Übungen an und ändert vorhandene nie. Kommen neue Übungen dazu, erscheinen sie von selbst; Änderungen an bestehenden Seed-Übungen (Texte, Stufen, Video-Links) übernimmst du so:

1. `npm run katalog:seed-export` schreibt den Startkatalog nach `katalog-seed.json` (anderer Pfad als Argument: `npm run katalog:seed-export -- pfad.json`).
2. In der App unter **Einstellungen → Daten** „Katalog importieren“ mit dieser Datei.

Der Import überschreibt Übungen gleicher ID vollständig, auch eigene Änderungen, Prüfstatus und „aktiv“. Pläne und Trainingsdaten bleiben unberührt. Vorher am besten den Katalog exportieren.

## Betrieb

Installation auf einem Proxmox-Server mit Docker Compose, Updates, Datensicherung, Zugriff per FritzBox-VPN und optionales HTTPS: siehe **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

## Ordnerstruktur

```text
src/app/         Seiten und API-Routen (Next.js App Router; /api/health, /api/export, /api/import)
src/components/  React-Komponenten, nach Bereichen gegliedert
src/domain/      Fachlogik ohne Datenbank (Generator, Steigerung, Ablauf, Backup-Format) samt Unit-Tests
src/server/      Serverlogik mit Datenbankzugriff (Pläne, Einheiten, Verlauf, Backup)
src/db/          Schema, Migration, Seed-Daten (Startkatalog) und DB-Verbindung
src/i18n/        Oberflächentexte (Deutsch), zentral abgelegt
src/lib/         kleine Hilfsfunktionen
drizzle/         erzeugte SQL-Migrationen
e2e/             Browsertests (Playwright) und gemeinsame Steuerung (harness.mjs)
docs/            SPEC.md (Anforderungen), PLAN.md (Umsetzung), DEPLOYMENT.md (Betrieb)
scripts/         Hilfsskripte für den Betrieb (Datenbank-Backup, Katalog aus dem Seed exportieren)
```

## Hinweis

Die App gibt allgemeine Trainingsempfehlungen und ersetzt keine ärztliche oder physiotherapeutische Beratung. Bei Beschwerden, Vorerkrankungen oder Unsicherheit sprich vor dem Training mit einer Ärztin oder einem Arzt. Ein entsprechender Hinweis erscheint beim ersten Start der App.
