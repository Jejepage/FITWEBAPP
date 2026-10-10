Du bist ein erfahrener Personal Trainer und Sportwissenschaftler mit Schwerpunkt Krafttraining für Erwachsene ab etwa 35 Jahren (allgemeine Fitness und Kraft erhalten, kein Bodybuilding, kein Leistungssport). Prüfe den Übungskatalog meiner selbst gebauten Trainings-App fachlich und auf Stimmigkeit. Im Anhang findest du den Katalog als JSON-Export aus der App.

Zu mir: [Alter, Trainingserfahrung, Beschwerden wie Knie, Rücken oder Schulter, Ziele]
Mein Equipment: [z. B. Kurzhanteln 2–20 kg in 2-kg-Schritten, Kettlebell 12 und 16 kg, Bank, Klimmzugstange; manchmal Studio]

---

## 1. Wie die App trainiert

Die App erstellt aus dem Katalog 6-Wochen-Pläne und begleitet das Training am Handy. Grundregeln:

- **Nur Mehrgelenksübungen**, eingeteilt in 8 Bewegungsmuster: KN Kniebeuge, HB Hüftbeuge, DH Drücken horizontal, DV Drücken vertikal, ZH Ziehen horizontal, ZV Ziehen vertikal, TR Tragen, RU Rumpf.
- **2 Ganzkörpereinheiten pro Woche** (optional 3, dann A-B-A / B-A-B), jeweils etwa 45 Minuten:

| Einheit | Block 1 (3 Runden) | Block 2 (3 Runden) | Zusatzblock (optional, 2 Runden) |
|---|---|---|---|
| A | KN + DH + ZH | HB + DV + ZV | TR + RU |
| B | HB + DH + ZV | KN + DV + ZH | TR + RU |

  Ein Block ist eine Dreier-Kombi im Zirkel: Übung 1 → 2 → 3, dann von vorn. Pausen 30–45 s zwischen den Übungen, 60–90 s nach jeder Runde. Vorher 5–8 Minuten Aufwärmen.
- **6-Wochen-Block:**

| Woche | Fokus | Vorgabe |
|---|---|---|
| 1–2 | Technik, Startgewichte, Einarbeiten | 3 Runden, 10–12 Wdh, Anstrengung „Leicht“ |
| 3–5 | Steigern | 3 Runden, 8–12 Wdh, „Leicht bis Gut“ |
| 6 | Entlasten und Test | 2 Runden, „Leicht“, keine Steigerung, danach Stufen-Check |

- **Anstrengung** wird pro Satz in vier Stufen erfasst (Reserve in Wiederholungen): Leicht (≥ 3), Gut (≈ 2), Schwer (≈ 1), Am Limit (0).
- **Steigerung (Doppelprogression):** Wenn in allen Sätzen das obere Ende des Bereichs mit „Leicht“ oder „Gut“ erreicht wird, schlägt die App vor:
  1. mehr Gewicht (Kurzhantel/Kettlebell: nächstes verfügbares Gewicht; Maschine/Langhantel: +2,5 kg), wenn `steigerungsart` „gewicht“ enthält und ein schwereres Gewicht vorhanden ist,
  2. sonst einmal Tempo (3 s Absenken), wenn „tempo“ enthalten ist (nur bei Wiederholungsübungen),
  3. sonst die nächste Stufe (`schwererId`), wenn „stufe“ enthalten ist.

  Sonst steigen die Wiederholungen schrittweise. Zeit- und Streckenübungen steigern Sekunden oder Meter. Bei Ersatzübungen schlägt die App nur Wiederholungen und Gewicht vor, nie Tempo oder die nächste Stufe.
- **Nach Woche 6** schlägt die App pro Muster vor, die Stufe zu halten oder zu erhöhen. Der nächste Block nimmt bevorzugt Übungen, die im letzten Block nicht dran waren.

## 2. Wie der Plan-Generator die Übungen auswählt

Für jedes Muster und jede Einheit:

1. **Kandidaten** sind aktive Übungen des Musters, für die **alle** Geräte aus `equipment` im Plan angekreuzt sind. Alltagsgegenstände (Stuhl, Tisch, Rucksack, Tasche, Wand, Tür) gelten als immer vorhanden und stehen nicht im Feld.
2. **Planübungen vor Ersatzübungen** (`ersatz: true`). Ersatzübungen nimmt der Generator nur, wenn es für das Muster mit dem Equipment keine Planübung gibt.
3. Innerhalb davon: zuerst die **Wunschstufe** des Musters (Standard: Stufe 2), dann die nächstniedrigeren Stufen, erst danach die höheren.
4. A und B bekommen verschiedene Übungen, B möglichst auch **keine Variante** der A-Übung.
5. Pro Woche soll mindestens eine **einseitige** KN- oder HB-Übung vorkommen (Gleichgewicht).
6. Findet der Generator für ein Muster **gar keine** Übung, lässt sich kein Plan erstellen.

Im Training kann man jede Übung für eine Einheit gegen eine andere des gleichen Musters tauschen, z. B. unterwegs oder wenn ein Gerät belegt ist. Ersatzübungen stehen dabei immer zur Wahl, auch wenn ihr Gerät (z. B. Band) nicht angekreuzt ist.

## 3. Aufbau der Datei

```json
{
  "format": "fit-backup",
  "version": 3,
  "erstelltAm": "2026-10-10T…Z",
  "art": "katalog",
  "daten": { "uebungen": [ { …Übung… }, … ] }
}
```

Felder einer Übung:

| Feld | Bedeutung und Regeln |
|---|---|
| `id` | `KN-01` … Format `XX-NN`, Präfix = Muster. Bleibt dauerhaft, neue Übungen bekommen die nächste freie Nummer im Muster |
| `name` | deutscher Name. Varianten tragen das Gerät im Namen („Goblet Squat mit Kurzhantel“ / „… mit Kettlebell“) |
| `muster` | KN, HB, DH, DV, ZH, ZV, TR, RU |
| `stufe` | Schwierigkeit 1–5 innerhalb des Musters (1 = Einstieg, 5 = sehr fortgeschritten) |
| `einseitig` | einbeinig oder einarmig (zählt für die Gleichgewichtsregel) |
| `equipment` | Liste der benötigten Geräte, **alle zusammen (UND)**. Werte: `maschinen`, `kabelzug`, `langhantel` (inkl. Rack), `kurzhanteln`, `kettlebell`, `bank`, `stange` (Klimmzugstange), `band` (Widerstandsband). `[]` = Körpergewicht oder Alltagsgegenstand |
| `leichterId` / `schwererId` | Nachbarn in der **Stufenleiter** (beidseitig verknüpft, Stufe steigt). Leitern verbinden vorrangig Übungen mit gleichem Gerätetyp. `schwererId` wird für die Steigerung „nächste Stufe“ genutzt |
| `hauptmuskeln` | 1–4 Einträge |
| `belastungsart` | `wdh` (Wiederholungen), `zeit` (Sekunden), `strecke` (Meter) |
| `standardBereich` | `8–12`, `20–40 s` oder `20–40 m` (Halbgeviertstrich). **Wichtig:** Nur Wiederholungsübungen mit genau `8–12` folgen der Wochentabelle (Woche 1–2: 10–12). Jeder andere Bereich gilt unverändert in allen Wochen |
| `steigerungsart` | Teilmenge von `gewicht`, `wdh`, `tempo`, `zeit`, `strecke`, `stufe`; steuert die Vorschläge (siehe oben) |
| `ausfuehrung` | 3–5 kurze Schritte, Du-Form |
| `fehler` | 2–4 typische Fehler |
| `hinweise` | Gelenke und Sicherheit, Alternativen. Querverweise im Format „Zu schwer: KN-01 Kniebeuge auf Stuhl/Box“, „Zu leicht: …“, „Mit Gewicht: …“, „Ohne Gewicht: …“ |
| `bild` | immer `null` (Bilder kommen später) |
| `videoUrl` | YouTube-Link in der Form `https://www.youtube.com/watch?v=<ID>` (optional `&t=<n>s`) oder `null`. **Varianten derselben Bewegung teilen sich denselben Link**: Daran erkennt der Generator Varianten (Regel 4 oben und „nicht wiederholen im nächsten Block“). Zwei verschiedene Bewegungen dürfen also nie denselben Link haben |
| `aktiv` | `false` = ausgeblendet, der Generator nutzt die Übung nicht |
| `pruefstatus` | `zu_pruefen` oder `geprueft` (meine eigene Abnahme) |
| `ersatz` | Ersatzübung (siehe Generator-Regel 2). Voreinstellung: `true` bei Übungen ohne Gerät oder nur mit Band, sonst `false`. Lässt sich pro Übung ändern. Idee dahinter: Mit Geräten wird über das Gewicht gesteigert, Körpergewichtsvarianten füllen nur Lücken oder dienen unterwegs zum Tauschen |

## 4. Was du prüfen sollst

1. **Fachliche Richtigkeit jeder Übung:** Stimmen Muster, Stufe, Hauptmuskeln, Ausführungsschritte und typische Fehler? Sind die Sicherheitshinweise für Erwachsene ab 35 angemessen und vollständig (Knie, unterer Rücken, Schulter, Handgelenk)? Gibt es inhaltliche Fehler oder missverständliche Formulierungen?
2. **Einstufung und Stufenleitern:** Ist die Stufe realistisch? Ist jede `schwererId` wirklich eine sinnvolle nächste Steigerung? Fehlen Leitern, die es geben sollte?
3. **Bereiche und Steigerung:** Passen `belastungsart`, `standardBereich` und `steigerungsart` zur Übung und zu den Regeln in Abschnitt 1? Ist bei einseitigen Übungen klar, dass der Bereich pro Seite gilt?
4. **Abdeckung je Equipment:** Spiele die Generator-Regeln aus Abschnitt 2 für typische Ausstattungen durch: mein Equipment, nur Kurzhanteln, Kurzhanteln + Bank ohne Stange, nur Körpergewicht + Band (unterwegs), Studio mit allem. Welche Übung bekäme ich bei Stufe 2 in A und B? Wo entsteht ein unpassender Plan (zu schwer, zu leicht, einseitig belastend) oder gar keiner?
5. **Ersatz-Kennzeichnung:** Ist `ersatz` je Übung sinnvoll gesetzt, gemessen an seiner Wirkung im Generator?
6. **Lücken und Überflüssiges:** Fehlen für die Zielgruppe wichtige Mehrgelenksübungen? Ist etwas für 35+ ungeeignet oder doppelt?
7. **Varianten und Videos:** Teilen genau die Varianten einer Bewegung denselben Link? Falls du Internetzugang hast: Gibt es jedes Video noch, zeigt es die Übung in der beschriebenen Form (richtiges Gerät, saubere Technik, möglichst seriöser Kanal)? Schlage für fehlende oder unpassende Videos konkrete Ersatzlinks vor. Kannst du Videos nicht aufrufen, sag das ausdrücklich und erfinde keine Links oder Titel.
8. **Sprache und Konsistenz:** Du-Form, kurze sachliche Sätze, einheitliche Begriffe, korrekte Querverweise (ID und Name passen zusammen).

## 5. Was du liefern sollst

1. **Kurzfazit** (5–10 Sätze): Wie gut ist der Katalog für die Zielgruppe, was sind die drei wichtigsten Baustellen?
2. **Befunde als Tabelle**, sortiert nach Priorität (Hoch = Sicherheit oder falscher Plan, Mittel = fachlich ungenau, Niedrig = Text und Stil):
   | Priorität | ID | Feld | Problem | Begründung | Konkreter Änderungsvorschlag (neuer Wortlaut oder Wert) |
3. **Ergebnis der Generator-Simulation** aus Punkt 4, je Ausstattung kurz.
4. **Neue Übungen** (falls du welche empfiehlst) als vollständige JSON-Objekte im Format oben, mit neuer ID am Ende des Musters, `pruefstatus: "zu_pruefen"`, `aktiv: true`, `bild: null`, und mit gepflegten Leiter-Verknüpfungen. Nenne dazu, welche bestehenden Übungen ihre `leichterId`/`schwererId` ändern müssen.
5. **Video-Liste:** je ID Status (ok / fehlt / unpassend / nicht geprüft) und ggf. Ersatzlink.

Regeln für deine Vorschläge:
- Bestehende IDs nicht umbenennen oder neu vergeben.
- Grenzen einhalten: `ausfuehrung` 3–5 Einträge, `fehler` 2–4, `hauptmuskeln` 1–4, `equipment` ohne „keins“, Bereiche im Format oben.
- Nur Mehrgelenksübungen, keine Isolationsübungen.
- Stelle Unsicheres als Frage oder Annahme dar, nicht als Tatsache.
- Antworte auf Deutsch.
