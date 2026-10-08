# SPEC – Fitnesskonzept-Webapp

Version 0.1 · Stand 07.10.2026 · Phase 1 (ohne Schaubilder)

## 1. Ziel

Eine selbst gehostete Webapp, die aus einem Übungskatalog personalisierte 6-Wochen-Trainingspläne erstellt und das Training begleitet (Durchführung, Protokoll, Steigerung).

- Zielgruppe: Erwachsene ab ca. 35, allgemeine Fitness und Kraft erhalten, kein Bodybuilding
- Nutzung zunächst nur durch eine Person (Eigentümer)
- Bedienung im Browser am PC und am Smartphone (Training läuft am Handy)
- Daten liegen auf dem eigenen Server

**Nicht Teil von Phase 1:** Schaubilder/Bilder der Übungen (Phase 2), mehrere Nutzer, Ernährung, Wearables/Apple Health.

## 2. Trainingskonzept (fachliche Regeln)

### 2.1 Grundprinzip
- 2 Einheiten pro Woche (optional 3), Ganzkörper, ca. 45 Minuten
- Nur Mehrgelenksübungen, eingeteilt nach **Bewegungsmustern**
- Ein Plan legt **Muster-Slots** fest; welche Übung einen Slot füllt, ergibt sich aus Equipment und Stufe

### 2.2 Bewegungsmuster

| Code | Muster |
|---|---|
| KN | Kniebeuge |
| HB | Hüftbeuge |
| DH | Drücken horizontal |
| DV | Drücken vertikal |
| ZH | Ziehen horizontal |
| ZV | Ziehen vertikal |
| TR | Tragen |
| RU | Rumpf |

### 2.3 Aufbau einer Einheit

1. **Aufwärmen** (5–8 Min): Mobilisation, Gleichgewicht (z. B. Einbeinstand), leichte Schnellkraft (z. B. kleine Sprünge). Feste kurze Abfolge, in Phase 1 als Text.
2. **Block 1** – Dreier-Kombi, 3 Runden: Übung 1 → 2 → 3, dann von vorn
3. **Block 2** – Dreier-Kombi, 3 Runden
4. **Zusatzblock (optional)** – TR + RU, 2 Runden

Pausen: 30–45 s beim Wechsel innerhalb der Kombi, 60–90 s nach jeder Runde (Richtwert, nach Gefühl; die App hat keinen Timer).

**Variante 6 Übungen:** nur Block 1 + 2. **Variante 8 Übungen:** zusätzlich Zusatzblock. Wahl pro Plan, in jeder Einheit überschreibbar.

### 2.4 Einheiten A und B

| | Block 1 | Block 2 | Zusatz |
|---|---|---|---|
| A | KN + DH + ZH | HB + DV + ZV | TR + RU |
| B | HB + DH + ZV | KN + DV + ZH | TR + RU |

- A und B nutzen möglichst **unterschiedliche Übungen** für dasselbe Muster
- In KN oder HB soll pro Woche mindestens eine **einseitige** Übung vorkommen (Gleichgewicht)
- 2×/Woche: A, B. 3×/Woche: abwechselnd A-B-A / B-A-B

### 2.5 6-Wochen-Block und Steigerung

| Woche | Fokus | Vorgabe |
|---|---|---|
| 1 | Technik, Startgewichte finden | 3 × 10–12, Anstrengung (RPE) ca. 6 |
| 2 | Einarbeiten | 3 × 10–12, RPE ca. 7 |
| 3–5 | Steigern | 3 × 8–12, RPE 7–8, Doppelprogression |
| 6 | Entlasten und Test | 2 Runden, RPE ca. 6, Stufen-Check |

**Doppelprogression:** Wenn in allen Sätzen das obere Ende des Wiederholungsbereichs bei RPE ≤ 8 erreicht wird, schlägt die App für die nächste Einheit mehr Gewicht vor (Kurzhantel/Kettlebell: nächste verfügbare Stufe, Maschine/Langhantel: +2,5 kg bzw. kleinste Stufe).

**Steigerung ohne mehr Gewicht** (Körpergewicht oder Hanteln am Limit): erst Wiederholungen bis Obergrenze, dann Tempo (3 s Absenken), dann nächste Stufe der Übung.

**Zeit-/Streckenübungen** (Plank, Tragen): Steigerung in Sekunden bzw. Metern/Gewicht.

**Nach Woche 6:** App schlägt pro Muster vor, die Stufe zu halten oder zu erhöhen, und erstellt den nächsten Block mit anderen Übungsvarianten.

## 3. Equipment

### 3.1 Equipment-Arten

`maschinen` (Geräte und Kabelzug im Studio), `langhantel` (inkl. Rack), `kurzhanteln`, `kettlebell`, `bank`, `stange` (Klimmzugstange o. Ä.), `band` (Widerstandsband), `keins`.

Alltagsgegenstände (Stuhl, Tisch, Rucksack, Wand) gelten als immer verfügbar.

### 3.2 Profile

Der Nutzer kreuzt Equipment an und speichert es als Profil. Voreinstellungen:

| Profil | Equipment |
|---|---|
| Studio | alles |
| Zuhause | kurzhanteln, kettlebell, bank, stange |
| Unterwegs | stange (Annahme: etwas zum Hochziehen ist immer vorhanden) |

Zusätzlich speicherbar: verfügbare Hantelgewichte zuhause (z. B. Kurzhanteln 2–20 kg in 2-kg-Schritten, Kettlebell 12 und 16 kg) für sinnvolle Gewichtsvorschläge.

### 3.3 Equipment-Bedingung einer Übung

Als Liste von Gruppen: innerhalb einer Gruppe reicht eines, alle Gruppen müssen erfüllt sein.
Beispiel Goblet Squat: `[["kurzhanteln","kettlebell"]]`. Beispiel Kurzhantel-Bankdrücken: `[["kurzhanteln"],["bank"]]`. Körpergewicht: `[]`.

## 4. Übungskatalog

### 4.1 Felder pro Übung

| Feld | Typ | Beschreibung |
|---|---|---|
| id | string | z. B. `HB-06` |
| name | string | deutscher Name |
| muster | enum | KN, HB, DH, DV, ZH, ZV, TR, RU |
| stufe | 1–5 | Schwierigkeit |
| einseitig | bool | einbeinig/einarmig |
| equipment | Gruppenliste | siehe 3.3 |
| leichter_id / schwerer_id | string? | Nachbarn in der Stufenleiter |
| hauptmuskeln | string[] | |
| belastungsart | enum | `wdh`, `zeit`, `strecke` |
| standard_bereich | string | z. B. `8–12` oder `20–40 s` |
| steigerungsart | enum[] | `gewicht`, `wdh`, `tempo`, `zeit`, `stufe` |
| ausfuehrung | string[] | 3–5 kurze Schritte |
| fehler | string[] | typische Fehler |
| hinweise | string | Gelenke (Knie, Rücken, Schulter), Alternativen |
| bild | string? | Phase 2, in Phase 1 leer |
| video_url | string? | YouTube-Link (Änderungswunsch nach Phase 1): wird immer in die Standardform `https://www.youtube.com/watch?v=<ID>[&t=<n>s]` gebracht; nur YouTube-Adressen erlaubt; in der App nur als Link „Video ansehen“ |
| aktiv | bool | Übung ausblenden statt löschen |

### 4.2 Startkatalog (Seed)

Ausführung, Fehler und Hinweise erstellt Claude Code beim Seed auf Deutsch, kurz und sachlich; jeder Eintrag erhält zunächst den Status „zu prüfen".

Abkürzungen Equipment: M = maschinen, LH = langhantel, KH = kurzhanteln, KB = kettlebell, BK = bank, ST = stange, BD = band, – = keins.

**Kniebeuge (KN)**
| ID | Name | Equipment | Stufe | einseitig |
|---|---|---|---|---|
| KN-01 | Kniebeuge auf Stuhl/Box | – | 1 | |
| KN-02 | Beinpresse | M | 2 | |
| KN-03 | Kniebeuge mit Körpergewicht | – | 2 | |
| KN-04 | Goblet Squat | KH oder KB | 2 | |
| KN-05 | Split Squat (stationärer Ausfallschritt) | – / KH | 3 | ja |
| KN-06 | Ausfallschritt rückwärts | KH oder KB | 3 | ja |
| KN-07 | Bulgarian Split Squat | Stuhl/BK, optional KH | 4 | ja |
| KN-08 | Langhantel-Kniebeuge | LH | 4 | |

**Hüftbeuge (HB)**
| ID | Name | Equipment | Stufe | einseitig |
|---|---|---|---|---|
| HB-01 | Hüftbrücke | – | 1 | |
| HB-02 | Rückenstrecker (Hyperextension) | M | 2 | |
| HB-03 | Einbeinige Hüftbrücke | – | 2 | ja |
| HB-04 | Rumänisches Kreuzheben mit Kurzhanteln | KH | 2 | |
| HB-05 | Kettlebell-Kreuzheben | KB | 2 | |
| HB-06 | Kettlebell-Swing | KB | 3 | |
| HB-07 | Hip Thrust auf der Bank | BK + KH oder LH | 3 | |
| HB-08 | Rumänisches Kreuzheben mit Langhantel | LH | 3 | |
| HB-09 | Einbeiniges rumänisches Kreuzheben | – / KH / KB | 4 | ja |

**Drücken horizontal (DH)**
| ID | Name | Equipment | Stufe | einseitig |
|---|---|---|---|---|
| DH-01 | Brustpresse | M | 1 | |
| DH-02 | Liegestütz mit erhöhten Händen | – | 1 | |
| DH-03 | Kurzhantel-Bankdrücken | KH + BK | 2 | |
| DH-04 | Liegestütz | – | 2 | |
| DH-05 | Kurzhantel-Schrägbankdrücken | KH + BK | 3 | |
| DH-06 | Langhantel-Bankdrücken | LH + BK | 3 | |
| DH-07 | Liegestütz mit erhöhten Füßen | – | 4 | |

**Drücken vertikal (DV)**
| ID | Name | Equipment | Stufe | einseitig |
|---|---|---|---|---|
| DV-01 | Schulterpresse | M | 1 | |
| DV-02 | Schulterdrücken mit Band | BD | 1 | |
| DV-03 | Pike-Liegestütz mit erhöhten Händen | – | 2 | |
| DV-04 | Kurzhantel-Schulterdrücken sitzend | KH + BK | 2 | |
| DV-05 | Kurzhantel-Schulterdrücken stehend | KH | 3 | |
| DV-06 | Einarmiges Kettlebell-Drücken | KB | 3 | ja |
| DV-07 | Pike-Liegestütz | – | 3 | |
| DV-08 | Pike-Liegestütz mit erhöhten Füßen | – | 4 | |

**Ziehen horizontal (ZH)**
| ID | Name | Equipment | Stufe | einseitig |
|---|---|---|---|---|
| ZH-01 | Kabelrudern sitzend | M | 1 | |
| ZH-02 | Rudern mit Band | BD | 1 | |
| ZH-03 | Einarmiges Kurzhantelrudern auf der Bank | KH + BK | 2 | ja |
| ZH-04 | Einarmiges Kettlebell-Rudern | KB | 2 | ja |
| ZH-05 | Brustgestütztes Kurzhantelrudern | KH + BK | 2 | |
| ZH-06 | Vorgebeugtes Kurzhantelrudern | KH | 3 | |
| ZH-07 | Rudern unter dem Tisch | – | 3 | |

**Ziehen vertikal (ZV)**
| ID | Name | Equipment | Stufe | einseitig |
|---|---|---|---|---|
| ZV-01 | Latzug | M | 1 | |
| ZV-02 | Hängen an der Stange | ST | 1 | |
| ZV-03 | Unterstützter Klimmzug (Maschine) | M | 2 | |
| ZV-04 | Klimmzug mit Fußhilfe | ST | 2 | |
| ZV-05 | Negativer Klimmzug | ST | 3 | |
| ZV-06 | Klimmzug | ST | 4 | |
| ZV-07 | Klimmzug mit Zusatzgewicht | ST + KH oder KB | 5 | |

**Tragen (TR)**
| ID | Name | Equipment | Stufe | einseitig |
|---|---|---|---|---|
| TR-01 | Rucksack tragen | – | 1 | |
| TR-02 | Farmer's Walk | KH oder KB | 1 | |
| TR-03 | Bärengang | – | 2 | |
| TR-04 | Koffertragen einarmig | KH oder KB | 2 | ja |
| TR-05 | Front-Rack-Tragen | KB | 3 | |
| TR-06 | Überkopf-Tragen einarmig | KH oder KB | 4 | ja |

**Rumpf (RU)**
| ID | Name | Equipment | Stufe | einseitig |
|---|---|---|---|---|
| RU-01 | Dead Bug | – | 1 | |
| RU-02 | Bird Dog | – | 1 | ja |
| RU-03 | Unterarmstütz (Plank) | – | 1 | |
| RU-04 | Seitstütz | – | 2 | ja |
| RU-05 | Pallof Press | M oder BD | 2 | ja |
| RU-06 | Hollow Hold | – | 3 | |
| RU-07 | Hängendes Knieheben | ST | 3 | |
| RU-08 | Turkish Get-up | KB | 4 | ja |

Stufenleitern (leichter/schwerer) verknüpfen vorrangig Übungen **mit gleichem Equipment-Typ** (z. B. ZV-02 → ZV-04 → ZV-05 → ZV-06 → ZV-07; DH-02 → DH-04 → DH-07).

## 5. Funktionen

### F1 Katalog
- Liste mit Filter nach Muster, Equipment-Profil, Stufe, einseitig
- Detailansicht mit allen Feldern und Stufenleiter (leichter/schwerer anklickbar)
- Übungen anlegen, bearbeiten, deaktivieren
- Optionaler YouTube-Link je Übung (editierbar); Anzeige als Knopf „Video ansehen“ im Katalog und im Training, ohne eingebetteten Player

### F2 Equipment und Einstellungen
- Profile anlegen/bearbeiten (Häkchen pro Equipment, vorhandene Gewichte)
- Startstufe pro Muster (Standard: 2)
- Standard: Einheiten pro Woche (2/3), Zusatzblock ja/nein

### F3 Plan-Generator
Eingabe: Profil, Stufen pro Muster, Einheiten/Woche, Zusatzblock, Startdatum.

Auswahllogik pro Slot:
1. Kandidaten = aktive Übungen des Musters, deren Equipment das Profil erfüllt
2. Bevorzugt Stufe = Nutzerstufe, sonst nächstniedrigere, sonst nächsthöhere
3. A und B erhalten verschiedene Übungen, falls möglich
4. Regel „mindestens eine einseitige KN/HB-Übung pro Woche" einhalten
5. Bei Folgeblöcken: bevorzugt Übungen, die im letzten Block nicht verwendet wurden

Ergebnis: Vorschau beider Einheiten. Jeder Slot lässt sich manuell tauschen (Auswahl nur aus passenden Kandidaten). Danach Plan speichern und aktivieren. Ein aktiver Plan zur Zeit.

### F4 Training durchführen (mobil optimiert)
- Startseite zeigt die nächste fällige Einheit (A/B), Woche x von 6, Wochenvorgabe
- Ablauf rundenweise: aktuelle Übung groß, Vorgabe (Gewicht/Wdh/Zeit), Werte vom letzten Mal
- Pro Satz erfassen: Gewicht, Wdh oder Sekunden/Meter, RPE 1–10, erledigt; vorausgefüllt mit Vorschlag
- Kein Pausentimer (Änderung nach Abschnitt 6): nach „erledigt" erscheint direkt der nächste Satz
- Übung in der Einheit ersetzen (z. B. Gerät belegt) durch Kandidaten desselben Musters
- Einheit unterbrechen und fortsetzen; Abschluss mit optionaler Notiz
- Bildschirm bleibt während des Trainings an (Wake Lock, wenn verfügbar)

### F5 Steigerung
- Nach jeder Einheit Gewichts-/Wdh-Vorschlag pro Übung nach Regeln aus 2.5
- Ende Woche 6: Stufen-Check pro Muster und Button „Nächsten Block erstellen"

### F6 Ad-hoc-Profilwechsel
- Vor dem Start einer Einheit anderes Profil wählen (z. B. „Unterwegs")
- Slots werden für diese Einheit durch Übungen gleichen Musters und ähnlicher Stufe ersetzt; der Plan selbst bleibt unverändert
- Diese Einheiten zählen für den Wochenfortschritt, aber nicht für die Steigerung der Planübungen

### F7 Verlauf
- Kalender/Liste absolvierter Einheiten
- Pro Übung: Verlauf (Datum, bester Satz, geschätztes Volumen) mit einfachem Diagramm
- Blockübersicht: geplante vs. absolvierte Einheiten

### F8 Datensicherung
- Export/Import aller Daten als JSON
- Katalog separat exportier- und importierbar

## 6. Datenmodell (Vorschlag)

- `exercise` – Felder aus 4.1 (Listen als JSON)
- `equipment_profile` – id, name, equipment[], gewichte (JSON), ist_standard
- `settings` – stufen pro Muster, einheiten_pro_woche, zusatzblock
- `plan` – id, profil_id, start_datum, einheiten_pro_woche, zusatzblock, status (aktiv/abgeschlossen), vorgaenger_id
- `plan_slot` – plan_id, einheit (A/B), block (1/2/Z), position, muster, exercise_id
- `workout` – id, plan_id, datum, einheit, woche, profil_id, ad_hoc (bool), status, notiz
- `set_log` – workout_id, plan_slot_id?, exercise_id, runde, gewicht, wdh, sekunden, meter, rpe, erledigt
- `suggestion` – exercise_id, plan_id, gewicht, wdh_ziel, erstellt_am (oder bei Bedarf berechnen)

## 7. Technik

- **Stack:** Next.js (App Router) + TypeScript, Tailwind CSS, SQLite mit Drizzle ORM
- **App-Form:** Progressive Web App (installierbar auf dem Homescreen), mobile-first
- **Betrieb:** ein Docker-Container (App + SQLite-Datei auf Volume), Docker Compose
- **Hosting:** eigener Proxmox-Server, Zugriff nur über VPN
- **Zugang:** Phase 1 ohne Benutzerverwaltung; optional ein einfaches Passwort per Umgebungsvariable
- **Keine externen Dienste:** keine CDNs, kein Tracking, Schriften und Libraries lokal gebündelt
- **Sprache:** Oberfläche Deutsch, Texte zentral abgelegt (spätere Übersetzung möglich)
- **Backup:** SQLite-Datei per Volume sicherbar, zusätzlich JSON-Export (F8)
- **Tests:** Unit-Tests für Plan-Generator und Steigerungslogik

## 8. Umsetzung in Abschnitten

Jeder Abschnitt endet mit lauffähiger App und manueller Prüfung.

1. **Projekt-Setup** – Next.js, Tailwind, Drizzle/SQLite, Docker Compose, Grundlayout mit Navigation. *Fertig, wenn:* Container startet, leere App im Browser und am Handy erreichbar.
2. **Datenmodell und Seed** – Tabellen, Seed des Katalogs aus 4.2 inkl. erzeugter Ausführungstexte und Stufenleitern, Standardprofile. *Fertig, wenn:* Seed läuft idempotent, Daten in der DB prüfbar.
3. **Katalog (F1)** – Liste, Filter, Detail, Bearbeiten. *Fertig, wenn:* alle Übungen filterbar und editierbar.
4. **Equipment und Einstellungen (F2)** – *Fertig, wenn:* Profil „Unterwegs" filtert den Katalog korrekt.
5. **Plan-Generator (F3)** – inkl. Unit-Tests. *Fertig, wenn:* für alle drei Standardprofile gültige A/B-Pläne entstehen, Regeln aus 2.4 eingehalten, Slots tauschbar.
6. **Training durchführen (F4)** – *Fertig, wenn:* eine komplette Einheit am Handy durchlaufen und gespeichert werden kann.
7. **Steigerung und Verlauf (F5, F7)** – inkl. Unit-Tests. *Fertig, wenn:* Vorschläge nach Regeln erscheinen, Verlauf pro Übung sichtbar.
8. **Ad-hoc-Wechsel und Datensicherung (F6, F8)**
9. **PWA und Deployment** – Manifest, Icons, Offline-Fallback für die laufende Einheit, Deployment-Anleitung für Proxmox. *Fertig, wenn:* App auf dem iPhone installierbar und im Studio nutzbar.

## 9. Phase 2 (Ausblick)

- Schaubilder pro Übung (Feld `bild`), Upload und Zuordnung in der Katalogpflege
- Anzeige im Katalog und während des Trainings
- Bildstil einheitlich (z. B. einfache Strichzeichnungen, Start- und Endposition)

## 10. Offene Punkte

- Startstufen: per Selbsteinschätzung oder kurzem Einstiegstest pro Muster?
- Aufwärmprogramm: fester Text oder eigener Mini-Katalog?
- Soll die App Hinweise zu Beschwerden erfassen (z. B. Knie) und Übungen danach filtern?
- Gewichtseinheit fest kg?

## 11. Hinweis

Die App gibt allgemeine Trainingsempfehlungen und ersetzt keine ärztliche oder physiotherapeutische Beratung. Ein entsprechender Hinweis erscheint beim ersten Start.
