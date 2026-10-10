# Katalog-Prüfung aus Trainersicht

Stand 10.10.2026 · Grundlage: Seed im Repo (76 Übungen), nicht die laufende Datenbank. Wurden Übungen in der App geändert, bitte einen Katalog-Export zum Abgleich nachreichen.

## Was technisch stimmt

- Alle Stufenleitern sind in beide Richtungen verknüpft, die Stufen steigen, kein Verweis zeigt auf eine fehlende Übung.
- Alle 76 Übungen haben einen YouTube-Link. Varianten teilen sich den Link, wie es die Spec verlangt.
- Die Texte sind insgesamt sachlich, kurz und für die Zielgruppe 35+ passend. Die Sicherheitshinweise (Stange prüfen, Stuhl an die Wand, Rack-Sicherung, Rücken gerade) sind gut.

## A. Wichtig: wirkt sich auf die Pläne aus

Geprüft mit dem echten Plan-Generator und den Standardstufen (alle Muster auf Stufe 2).

### A1 Rumpf: Einsteiger bekommt Turkish Get-up

Alle Rumpfübungen ohne Gerät (Dead Bug, Bird Dog, Plank, Seitstütz, Hollow Hold) sind nach der Regel „ohne Gerät = Ersatz“ als Ersatzübungen markiert. Mit Standard-Equipment (Kurzhanteln, Kettlebell, Bank, Stange) bleiben als Planübungen nur RU-07 Hängendes Knieheben (Stufe 3) und RU-08 Turkish Get-up (Stufe 4). Ergebnis bei Stufe 2:

- Einheit A, Zusatzblock: RU-07 Hängendes Knieheben (Stufe 3)
- Einheit B, Zusatzblock: **RU-08 Turkish Get-up (Stufe 4)**: technisch die anspruchsvollste Übung im Katalog, mit der kleinsten Kettlebell (12 kg) für Einsteiger zu schwer

Beim Rumpftraining ist das Körpergewicht der Normalfall und kein Notbehelf. **Empfehlung:** Rumpfübungen ohne Gerät sind keine Ersatzübungen (Ausnahme in `istErsatzStandard` für das Muster RU). Dann wählt der Generator bei Stufe 2 z. B. Seitstütz und Dead Bug, der Get-up kommt erst ab Stufe 4.

### A2 Ziehen vertikal: ohne Stange kein Plan

Für ZV gibt es keine Übung ohne Stange, Kabelzug oder Maschine, und auch keine Ersatzübung. Mit „nur Kurzhanteln“, „Kurzhanteln + Bank“ oder „Kurzhanteln + Kettlebell + Bank“ bricht der Generator ab (`fehlendeMuster: ["ZV"]`). Wer zuhause keine Stange hat, kann die App also nicht nutzen. **Empfehlung**, neue Übungen:

| Vorschlag | Equipment | Stufe | Rolle |
|---|---|---|---|
| ZV-08 Latzug mit Band (kniend, Band oben an Tür oder Haken) | Band | 1 | Ersatz |
| ZV-09 Kurzhantel-Pullover auf der Bank | KH + Bank | 2 | Planübung |

Der Pullover ist kein vollwertiger Klimmzugersatz, trainiert aber den Latissimus in der vertikalen Ebene. Er ist mit kleinem Bewegungsumfang auch für Schultern ab 35 gut machbar.

### A3 Ziehen horizontal: einarmiges Kurzhantelrudern ohne Bank fehlt

ZH-04 (einarmiges Rudern, abgestützt auf Oberschenkel oder Stuhl) gibt es nur mit Kettlebell, ZH-03 mit Kurzhantel nur auf der Bank. Mit nur Kurzhanteln bleibt als Planübung ZH-06 Vorgebeugtes Rudern (Stufe 3, belastet den unteren Rücken). **Empfehlung:** ZH-09 Einarmiges Kurzhantelrudern mit Abstützen (KH, Stufe 2, einseitig), als Variante von ZH-04.

### A4 Drücken horizontal: ohne Bank nur Liegestütz

Ohne Bank gibt es keine Planübung für DH. **Empfehlung:** DH-08 Kurzhantel-Bodendrücken (KH, Stufe 2): Der Boden begrenzt den Bewegungsumfang, das schont die Schultern. Das ist für die Zielgruppe ideal.

### A5 Optional: Step-up

Für Erwachsene ab 35 gehört das Aufsteigen auf eine Stufe oder Bank (einbeinig, Gleichgewicht, alltagsnah) zu den wertvollsten Kniebeuge-Varianten. **Empfehlung:** KN-13 Step-up (ohne Gerät, Stufe 2, einseitig, Ersatz) und KN-14 Step-up mit Kurzhanteln (KH, Stufe 3, einseitig, Planübung).

## B. Fehler in Texten (eindeutig, sofort korrigierbar)

| Übung | Problem | Korrektur |
|---|---|---|
| HB-04 | Hinweis „Zu leicht: HB-09 Einbeiniges rumänisches Kreuzheben mit Kurzhantel“, HB-09 ist aber die Variante ohne Gewicht | HB-14 |
| TR-04, TR-09 | „… und greife es“ (Kurzhantel und Kettlebell sind feminin) | „greife sie“ |
| HB-10, HB-13 | „ohne den Boden abzulegen“ | „ohne das Gesäß auf dem Boden abzulegen“ |
| KN-05, KN-06, KN-07, KN-10, KN-11, KN-12, HB-03, HB-09, HB-10, HB-13, HB-14, ZH-03, ZH-04, DV-06, RU-02, RU-05, RU-09 | Bei einseitigen Übungen steht nirgends, ob der Wiederholungsbereich pro Seite gilt (bei den Tragen-Übungen steht es). Wichtig für die Doppelprogression | Im Hinweis „Der Bereich gilt pro Seite.“ und im letzten Schritt „wechsle dann die Seite“ |
| RU-02 Bird Dog | ist als einseitig markiert, der Dead Bug (gleiches Prinzip, abwechselnd) nicht. Die Ausführung sagt nicht, ob abwechselnd oder seitenweise | Einheitlich: beide abwechselnd, Bereich „pro Seite“ |

## C. Fachliche Feinheiten (kein Muss)

- **DV-06 Einarmiges Kettlebell-Drücken:** Mit 12 kg als kleinster Kettlebell schaffen viele Einsteiger keine 6–10 sauberen Wiederholungen. Hinweis ergänzen: „Zu schwer: DV-05 mit Kurzhantel, da feiner abstufbar.“
- **RU-08 Turkish Get-up:** Hinweis ergänzen, dass man mit einer leichten Kurzhantel beginnt, bevor die Kettlebell dazukommt.
- **RU-03 → RU-04 (Plank → Seitstütz):** Der Seitstütz ist keine Steigerung des Plank, sondern eine andere Richtung (seitlich). Als Leiter ist das vertretbar, eine echte Steigerung wäre z. B. ein Plank mit Schulterantippen.
- **TR-03 Bärengang** ist kein Tragen. Das steht schon im Hinweis, er hat keine Leiter, passt so.

## D. Videos

Die Links konnte ich nicht prüfen: Der Cloud-Container hat keinen Zugang zu YouTube. Dafür gibt es jetzt ein Skript, das jeden Link über die YouTube-oEmbed-Schnittstelle abfragt (gibt es das Video noch, Titel, Kanal):

```
npm run katalog:videos-pruefen                               # Seed prüfen
npm run katalog:videos-pruefen -- katalog-export.json        # Katalog-Export der App prüfen
```

Das Ergebnis steht in `video-pruefung.md`. Mit dieser Datei kann ich beurteilen, ob Titel und Inhalt zur Übung passen (z. B. Kettlebell-Video bei einer Kurzhantel-Übung), und für fehlende Videos Ersatz vorschlagen.

Hinweis zu den Varianten: Der Generator erkennt Varianten am gemeinsamen Link. Wird ein geteilter Link ersetzt, müssen alle Varianten den neuen Link bekommen (z. B. HB-07, HB-11 und HB-12 gemeinsam).
