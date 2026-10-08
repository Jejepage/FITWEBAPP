# FITWEBAPP

Selbst gehostete Fitness-Webapp: Sie erstellt aus einem Übungskatalog personalisierte 6-Wochen-Trainingspläne (zwei Einheiten A/B) und begleitet das Training am Handy mit Protokoll und Steigerungsvorschlägen. Gedacht für eine Person (Erwachsene ab ca. 35, allgemeine Fitness und Kraft erhalten), die Daten bleiben auf dem eigenen Server.

Dieses Repo enthält **Phase 1** laut [docs/SPEC.md](docs/SPEC.md) (ohne Schaubilder der Übungen, ohne mehrere Nutzer).

## Funktionen

- **Übungskatalog** mit Filtern (Muster, Equipment-Profil, Stufe, einseitig), Stufenleitern, eigene Übungen anlegen, bearbeiten, deaktivieren
- **Equipment-Profile** (z. B. „Unterwegs") und Einstellungen: Startstufe pro Muster, Einheiten pro Woche, Zusatzblock
- **Plan-Generator** für 6-Wochen-Blöcke mit Einheiten A und B, Slots manuell tauschbar
- **Training durchführen**, mobil optimiert: rundenweise Sätze mit Gewicht, Wiederholungen/Zeit und RPE, Einheit unterbrechen und fortsetzen
- **Steigerung**: Vorschläge nach jeder Einheit, Stufen-Check am Blockende, „Nächsten Block erstellen"
- **Ad-hoc-Profilwechsel** vor einer Einheit, ohne den Plan zu ändern
- **Verlauf** mit Einheitenliste, Verlauf pro Übung (inkl. Diagramm) und Blockübersicht
- **Datensicherung**: Export/Import aller Daten oder nur des Katalogs als JSON

## Lokal entwickeln

Voraussetzung: Node.js ≥ 22.

```bash
npm ci
npm run dev
```

Die App läuft dann unter <http://localhost:3000>. Die SQLite-Datei liegt unter `./data/fit.db`; Migration und Seed (Startkatalog, Standardprofile) laufen beim Start automatisch. Einen anderen Pfad setzt du mit der Umgebungsvariable `DB_PATH` (siehe `.env.example`).

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

## Betrieb

Installation auf einem Proxmox-Server mit Docker Compose, Updates, Datensicherung, Zugriff per FritzBox-VPN und optionales HTTPS: siehe **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

## Ordnerstruktur

```text
src/app/         Seiten und API-Routen (Next.js App Router; /api/health, /api/export, /api/import)
src/components/  React-Komponenten, nach Bereichen gegliedert
src/domain/      Fachlogik ohne Datenbank (Generator, Steigerung, Ablauf, Backup-Format) samt Unit-Tests
src/server/      Serverlogik mit Datenbankzugriff (Pläne, Einheiten, Verlauf, Backup)
src/db/          Schema, Migration, Seed-Daten (Startkatalog, Profile) und DB-Verbindung
src/i18n/        Oberflächentexte (Deutsch), zentral abgelegt
src/lib/         kleine Hilfsfunktionen
drizzle/         erzeugte SQL-Migrationen
e2e/             Browsertests (Playwright) und gemeinsame Steuerung (harness.mjs)
docs/            SPEC.md (Anforderungen), PLAN.md (Umsetzung), DEPLOYMENT.md (Betrieb)
scripts/         Hilfsskripte für den Betrieb (Datenbank-Backup)
```

## Hinweis

Die App gibt allgemeine Trainingsempfehlungen und ersetzt keine ärztliche oder physiotherapeutische Beratung. Bei Beschwerden, Vorerkrankungen oder Unsicherheit sprich vor dem Training mit einer Ärztin oder einem Arzt. Ein entsprechender Hinweis erscheint beim ersten Start der App.
