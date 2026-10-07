# Plan: Fitnesskonzept-Webapp (Phase 1)

## Context

Aus `SPEC.md` (v0.1) entsteht eine selbst gehostete Webapp. Sie erstellt aus einem Übungskatalog 6-Wochen-Trainingspläne (2×/Woche, Ganzkörper, Muster-Slots) und begleitet das Training am Handy (Durchführung, Protokoll, Doppelprogression). Ein einziger Nutzer, Betrieb als Docker-Container hinter VPN. Das Repo ist leer (kein Commit, Node 22, Docker vorhanden). Entwicklung auf Branch `claude/clever-hopper-kzalrs`, ein Commit pro Spec-Abschnitt, kein PR ohne Aufforderung.

## Entscheidungen (mit dir geklärt)

| Thema | Entscheidung |
|---|---|
| Startstufen | Selbsteinschätzung pro Muster in den Einstellungen (Standard 2). Der Stufen-Check in Woche 6 korrigiert. |
| Beschwerden-Filter | Nicht in Phase 1. Gelenkhinweise stehen nur im Textfeld `hinweise`. |
| Offline im Studio | Online-first: jeder Satz geht per Server Action in die DB. Ein localStorage-Fallback hält nur den Zustand der laufenden Einheit bei kurzem Netzverlust. Keine Sync-Queue. |
| Subagenten | Abschnitte nacheinander mit Freigabe nach jedem. Parallel nur bei unabhängiger Arbeit (siehe Abschnitt „Umsetzung mit Subagenten"). |
| Hosting/Zugang | Docker Compose auf dem Proxmox-Server (am besten in einer VM), SQLite-Datei auf einem Volume. Erreichbar nur im Heimnetz oder per FritzBox-VPN, **vorerst nur HTTP**, kein Port-Forwarding und kein Reverse Proxy. HTTPS ist später optional nachrüstbar (Caddy als Compose-Profil), ohne Code zu ändern. |

## Folgen von „nur HTTP" (im Plan berücksichtigt)

Browser behandeln `http://192.168.x.x` nicht als sicheren Kontext. Daraus folgt:

- **Service Worker, Offline-Fallback, vollwertiger PWA-Install und Wake Lock sind über HTTP nicht verfügbar.** Das Manifest wird trotzdem mitgeliefert. Ob „Zum Home-Bildschirm" auf dem iPhone dann ein Vollbild-Icon erzeugt, prüfst du in Abschnitt 9 am Gerät. Alle diese Funktionen werden per Feature-Detection zugeschaltet: ohne HTTPS bleiben sie still aus, mit HTTPS gehen sie ohne Codeänderung an.
- **Display-Ausfall im Training:** Ohne Wake Lock schaltet das iPhone den Bildschirm nach der Auto-Sperre aus. Die App zeigt dann einen Hinweis („Auto-Sperre in den iPhone-Einstellungen verlängern"). Der Zustand der laufenden Einheit bleibt wegen des localStorage-Fallbacks und weil jeder Satz sofort gespeichert wird erhalten.
- **Technische Fallstricke, die ich von Anfang an vermeide:** `crypto.randomUUID()` gibt es nur im sicheren Kontext, ich nutze einen Fallback über `crypto.getRandomValues`. Das Auth-Cookie bekommt kein `Secure`-Flag. Keine Abhängigkeit von `navigator.clipboard` u. ä.
- **Netzwerk:** Der Container-Port wird nur auf die LAN-Adresse des Docker-Hosts gebunden, nicht auf 0.0.0.0 ins Internet. Es gibt keine Portfreigabe in der FritzBox. Das VPN-Handy erreicht den Server über die Heimnetz-IP (oder `fritz.box`-Hostname).

## Annahmen, die ich ohne Rückfrage getroffen habe (bitte beim Freigeben prüfen)

1. **Wochenzählung nach Fortschritt, nicht nach Kalender.** Eine Woche ist abgeschlossen, wenn `einheiten_pro_woche` Einheiten absolviert sind. Das Startdatum dient nur der Anzeige („fällig seit …"). Ad-hoc-Einheiten (F6) zählen mit (Spec F6).
2. **Aufwärmen:** ein fester Text, in den Einstellungen editierbar (kein Mini-Katalog).
3. **Gewichtseinheit:** fest kg.
4. **Vorschläge (`suggestion`) werden berechnet, nicht gespeichert.** Die Tabelle entfällt. Eine reine Funktion berechnet sie aus dem `set_log`. So gibt es keine veralteten Vorschläge.
5. **Zugang:** optionales Passwort über `APP_PASSWORD`. Ist es nicht gesetzt, ist die App offen (VPN schützt). Prüfung in der Middleware, Cookie per HMAC signiert.
6. **Seed schreibt nur, was fehlt** (insert-if-missing). Ein erneuter Lauf überschreibt nie deine Änderungen im Katalog.
7. **Stufen-Check (F5), Regel noch festzulegen:** Erhöhen, wenn die Planübung eines Musters in Woche 5 und 6 in allen Sätzen die Obergrenze bei RPE ≤ 7 erreicht. Senken, wenn zweimal die Untergrenze verfehlt wird oder RPE ≥ 9. Sonst halten. Die App schlägt vor, du bestätigst pro Muster. Die Schwellen sind Konstanten in `progression.ts`.
8. **Diagramme (F7):** eigenes Inline-SVG ohne Chart-Library (keine CDNs, wenige Abhängigkeiten).

### Ergänzungen zum Datenmodell der Spec

- `exercise.pruefstatus` (`zu_pruefen` | `geprueft`): Die Spec verlangt den Status „zu prüfen" in §4.2, führt aber kein Feld dafür auf.
- `exercise.optionale_last` (Equipment-Liste): Beispiele sind `–/KH` bei Split Squat und `Stuhl/BK, optional KH` bei Bulgarian Split Squat. Die Übung läuft mit `equipment: []`. Dieses Feld sagt, womit man sie beladen kann. Daraus ergibt sich, ob `gewicht` als Steigerungsart und welche Hantelstufen zählen.
- `settings.aufwaermen_text`.
- `set_log.id` (Client-UUID) für idempotentes Speichern bei erneutem Senden.
- Stufenleiter (`leichter_id`/`schwerer_id`) definiere ich zentral im Seed und sichere sie per Validierungstest ab (siehe unten).

## Architektur

**Stack:** Next.js (aktuelle stabile Version, App Router) + TypeScript strict, Tailwind CSS, SQLite mit Drizzle über `better-sqlite3`, Zod, Vitest. Schriften lokal gebündelt (`next/font/local`).

**Schichten (Abhängigkeit nur nach unten):**

```
src/app/            Routen, Server Components (Lesen), Server Actions (Schreiben)
src/components/     UI (mobile-first), Client Components nur wo nötig (Training, Timer)
src/server/         Queries/Repositories (Drizzle), Actions-Hilfen, Auth
src/domain/         REINE TS-Logik, keine DB/React-Importe, voll unit-getestet
  types.ts            Muster, Equipment, Exercise, Slot … (Vertrag für alle Module)
  equipment.ts        erfuellt(bedingung, profil) für Gruppenlisten
  generator.ts        Plan-Generator (F3), Kandidatenlisten, Tausch-Kandidaten
  weeks.ts            Wochenvorgaben 2.5, Rundenzahl, Pausenzeiten
  progression.ts      Doppelprogression, nächste Hantelstufe, Tempo/Stufe, Stufen-Check
src/db/             schema.ts, Migrationen, seed/ (Daten + Runner)
src/i18n/de.ts      alle UI-Texte zentral
```

**Datenfluss:** Seiten lesen per Server Component direkt aus `src/server`. Mutationen laufen über Server Actions mit Zod-Validierung. Nur der Trainingsbildschirm ist eine Client Component. Er hält den aktuellen Satz, den Pausentimer und den Wake Lock, und ruft pro erledigtem Satz eine Server Action auf. Daten werden im Training also nie nur im Client gehalten.

**Datenmodell:** Spec §6 mit den Änderungen oben. Listen (Equipment, Ausführung, Fehler …) liegen als JSON-Spalten (`text({ mode: 'json' })`). Der Folgeblock ist ein neuer `plan` mit `vorgaenger_id`. Ad-hoc-Einheiten sind `workout.ad_hoc = true`, ihre `set_log`-Zeilen verweisen auf eine andere `exercise_id` als der Slot. Beim Verlauf und bei der Steigerung (F5) werden sie gefiltert.

**Betrieb:** `output: 'standalone'`, `serverExternalPackages: ['better-sqlite3']`, mehrstufiges Dockerfile (Build-Stage mit Build-Tools für das native Modul, schlanke Runtime). Migrationen und Seed laufen beim Containerstart, die DB liegt auf dem Volume `/data`. PWA mit handgeschriebenem Manifest und kleinem Service Worker (kein `next-pwa`). Der Service Worker wird nur registriert, wenn `window.isSecureContext` gilt (also erst nach einem späteren HTTPS-Umstieg). Er cached App-Shell und aktive Einheit als Notfallfallback, aber ohne Sync-Queue. Über HTTP läuft die App als normale Webseite.

## Umsetzung mit Subagenten

Ich orchestriere. Abschnitt für Abschnitt: implementieren, Tests und Build, Review, Commit, dann Stopp zu deiner manuellen Prüfung. Der Vertrag zwischen Agenten ist `src/domain/types.ts` plus Zod-Schemas. Ich schreibe sie in Abschnitt 2, **bevor** ich Agenten parallel starte.

| Abschnitt | Wer | Parallelität |
|---|---|---|
| 1 Setup | ich | – (Gerüst muss konsistent sein) |
| 2 Datenmodell + Seed | ich: Schema, Typen, Seed-Skelett aus den Spec-Tabellen (ID, Name, Muster, Stufe, einseitig, Equipment, Leiter). Danach **8 Agenten parallel**, einer pro Muster: schreiben `ausfuehrung`, `fehler`, `hinweise`, `hauptmuskeln`, `standard_bereich`, `belastungsart`, `steigerungsart`, `optionale_last` für ihre Muster-Datei, alle `pruefstatus: zu_pruefen`. Danach 1 Reviewer-Agent: fachliche Plausibilität und Sicherheit der Texte. | ja, 8 Dateien ohne Überschneidung |
| 3 Katalog (F1) | ich | – |
| 4 Equipment/Einstellungen (F2) | ich | – |
| 5 Plan-Generator (F3) | **Agent A:** `generator.ts` + `equipment.ts` + Unit-Tests (testgetrieben nach Spec 2.4 und F3). Ich baue parallel die Plan-UI gegen die Funktionssignaturen. | ja |
| 6 Training (F4) | ich: Trainings-UI, Timer, Wake Lock, localStorage-Fallback. **Agent B parallel:** `progression.ts` + `weeks.ts` + Unit-Tests (Spec 2.5, rein, unabhängig von der UI). Das zieht die Logik aus Abschnitt 7 vor. | ja |
| 7 Steigerung + Verlauf (F5, F7) | ich: Anbindung und UI. **Agent C:** SVG-Verlaufsdiagramm-Komponente. | ja |
| 8 Ad-hoc + Backup (F6, F8) | ich. Ad-hoc nutzt die Kandidaten-Logik aus dem Generator, der Export/Import ist Zod-validiertes JSON. | – |
| 9 PWA + Deployment | ich: Manifest, Service Worker (nur bei sicherem Kontext aktiv), Icons. **Agent D:** Dockerfile-Härtung und Deployment-Anleitung für Proxmox: Docker-VM, Compose mit LAN-gebundenem Port, FritzBox-WireGuard-VPN fürs Handy, Backup der SQLite-Datei per Cron/Proxmox-Backup. Als optionaler Anhang: HTTPS nachrüsten (Caddy-Profil). | ja |

Nach jedem Abschnitt prüft ein **unabhängiger Reviewer-Agent** mit frischem Kontext den Diff gegen die Spec (`/code-review`). Beim Auth/Middleware-Teil zusätzlich `/security-review`.

## Kritische Dateien

- `src/domain/types.ts` – Vertrag, zuerst festlegen
- `src/db/schema.ts`, `src/db/seed/data/{kn,hb,dh,dv,zh,zv,tr,ru}.ts`, `src/db/seed/run.ts`
- `src/domain/generator.ts`, `src/domain/progression.ts` – die zwei Module mit echten Regeln, daher Tests zuerst
- `src/app/training/[workoutId]/…` – Herzstück der Handy-Nutzung
- `Dockerfile`, `docker-compose.yml`, `src/middleware.ts`

## Wichtige Prüffälle (Tests)

- **Generator:** Alle drei Standardprofile liefern gültige A/B-Pläne mit Regeln aus 2.4. Zum Beispiel ist „Unterwegs" für ZH nur mit ZH-07 möglich, dann sind gleiche Übungen in A und B erlaubt („falls möglich"). Pro Woche mindestens eine einseitige KN/HB-Übung. Folgeblock bevorzugt bisher nicht genutzte Übungen. Stufenwahl: Nutzerstufe, sonst nächstniedrigere, sonst nächsthöhere.
- **Equipment:** Gruppenlogik `[["kurzhanteln","kettlebell"]]`, `[["kurzhanteln"],["bank"]]`, `[]`.
- **Progression:** Obergrenze in allen Sätzen bei RPE ≤ 8 führt zu Gewichtserhöhung. Hantelstufen aus den Profilgewichten. Danach Wdh, Tempo, Stufe. Zeit- und Streckenübungen. Woche 6 zählt nicht zur Steigerung.
- **Seed-Validierung:** Leiter ohne Zyklen und mit gleichem Muster, Stufen strikt aufsteigend, alle IDs vorhanden, Equipment nur aus der erlaubten Liste, Seed zweimal ausführen ändert nichts.

## Verifikation

- Pro Abschnitt: `npm run lint`, `typecheck`, `vitest run`, `next build`, dann Start der App.
- Im Cloud-Container kann ich kein echtes Handy prüfen. Ich fahre die App mit Playwright (vorinstalliertes Chromium) im Mobil-Viewport durch: Katalog filtern, Plan generieren, eine Einheit komplett durchlaufen, Daten in der DB prüfen. Das ersetzt nicht deine manuelle Prüfung am iPhone (Abschnitt 9).
- Docker-Build und Start per `docker compose up` in Abschnitt 1 und 9, soweit der Container es erlaubt.
- Test über **HTTP** (nicht nur localhost, das Browser als sicher werten): Der Trainingsablauf läuft ohne Wake Lock/Service Worker fehlerfrei, die UUID-Erzeugung geht, der Hinweis zur Auto-Sperre erscheint.
- Medizinischer Hinweis (Spec §11) beim ersten Start: Zustimmung wird einmalig in `settings` gespeichert.
