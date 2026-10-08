# Betrieb und Deployment

Anleitung, um die App auf einem eigenen Proxmox-Server im Heimnetz (FritzBox) zu betreiben. Sie richtet sich an Leute, die technisch interessiert, aber keine Linux-Profis sind: kurze Schritte, kopierbare Befehle.

**Ehrlichkeit vorab:** Das Docker-Image wurde in der Entwicklungsumgebung **nicht gebaut** (dort gab es keinen Docker-Daemon). Getestet wurde ein Nachbau des Standalone-Verzeichnisses. Der erste `docker compose build` passiert also bei dir auf dem Server, Abschnitt [Fehlersuche](#11-fehlersuche) sagt, woran du Probleme erkennst. Stellen, die nicht ausprobiert wurden, sind mit „(nicht getestet)" markiert. Menübezeichnungen von Proxmox, FRITZ!OS und iOS können je nach Version abweichen.

## Inhaltsverzeichnis

1. [Überblick und Grundregeln](#1-überblick-und-grundregeln)
2. [Proxmox: VM anlegen](#2-proxmox-vm-anlegen)
3. [FritzBox: feste IP-Adresse für den Server](#3-fritzbox-feste-ip-adresse-für-den-server)
4. [Docker installieren](#4-docker-installieren)
5. [App installieren und starten](#5-app-installieren-und-starten)
6. [Umgebungsvariablen](#6-umgebungsvariablen)
7. [Zugriff vom Handy und per VPN](#7-zugriff-vom-handy-und-per-vpn)
8. [Betrieb und Updates](#8-betrieb-und-updates)
9. [Datensicherung](#9-datensicherung)
10. [Wiederherstellung](#10-wiederherstellung)
11. [Fehlersuche](#11-fehlersuche)
12. [Anhang A: HTTPS (optional, später)](#12-anhang-a-https-optional-später)

## 1. Überblick und Grundregeln

Die App läuft als **ein Docker-Container** (Dienst `app` in `docker-compose.yml`). Die SQLite-Datenbank liegt im Docker-Volume `fit-data`, im Container unter `/data/fit.db` (daneben die WAL-Dateien `fit.db-wal` und `fit.db-shm`). `restart: unless-stopped` startet den Container nach einem Neustart des Servers wieder.

```text
iPhone/PC im Heimnetz  --HTTP-->  VM (Docker): Port 3000 --> Container "app" --> Volume fit-data (/data/fit.db)
iPhone unterwegs  --WireGuard-VPN (FritzBox)-->  Heimnetz  --> wie oben
```

Grundregeln:

- **Kein Zugriff aus dem Internet.** In der FritzBox wird **keine Portfreigabe** für die App eingerichtet. Von außen kommst du nur über das FritzBox-WireGuard-VPN ins Heimnetz.
- **`BIND_ADDR` zeigt auf die LAN-IP des Docker-Hosts** (z. B. `192.168.178.50`), **nie auf `0.0.0.0`**. Ohne Angabe ist die App nur auf dem Server selbst erreichbar (`127.0.0.1`).
- **Vorerst nur HTTP.** HTTPS ist als optionaler Anhang beschrieben ([Anhang A](#12-anhang-a-https-optional-später)). Was ohne HTTPS fehlt, steht in [Abschnitt 7](#7-zugriff-vom-handy-und-per-vpn).
- **Beim Containerstart laufen Migration und Seed automatisch.** Der Seed ergänzt nur fehlende Übungen und Profile und überschreibt nie deine Änderungen.
- **Gesundheitsprüfung:** `GET /api/health` antwortet mit `{"ok":true}`. Diese Adresse ist immer frei zugänglich, auch wenn ein Passwort gesetzt ist.

## 2. Proxmox: VM anlegen

**Empfehlung: eine eigene VM** (Debian 12 oder Ubuntu Server LTS). Das ist die einfachste und robusteste Variante für Docker und lässt sich komplett mit Proxmox sichern.

| Ressource | Empfehlung |
| --- | --- |
| CPU | 1–2 vCPU |
| RAM | 2 GB (siehe Hinweis zum Build) |
| Disk | 8–16 GB reichen |
| Netzwerk | Bridge (`vmbr0`), damit die VM wie ein normales Gerät eine Adresse von der FritzBox bekommt |

Schritte (Bezeichnungen können je nach Proxmox-Version abweichen):

1. ISO von Debian 12 oder Ubuntu Server LTS in Proxmox bereitstellen und über „Create VM" eine VM mit den Werten oben anlegen. Beim Installieren „SSH server" mitinstallieren, eine Desktop-Oberfläche brauchst du nicht.
2. VM-Option **„Start at boot" = Yes** setzen, damit sie nach einem Neustart des Proxmox-Servers automatisch startet.
3. Optional: `sudo apt install qemu-guest-agent` in der VM und in den VM-Optionen „QEMU Guest Agent" aktivieren (nützlich für saubere Backups und Herunterfahren).
4. **Backup-Job** einrichten (siehe [Ebene 1 der Datensicherung](#ebene-1-proxmox-vm-backup)).

> **Hinweis zum RAM:** Der Next.js-Build im Docker-Build braucht deutlich mehr Speicher als der laufende Betrieb. Mit nur 1 GB RAM kann der Build abbrechen (Meldung wie `Killed` oder Exit-Code 137). Gib der VM dann für den Build vorübergehend mehr RAM oder lege eine Swap-Datei an.

**Alternative LXC-Container (nicht getestet):** Docker in einem LXC-Container geht, braucht aber besondere Einstellungen (typischerweise ein „privileged"-Container oder die Optionen `nesting` und `keyctl`, je nach Proxmox-Version) und ist anfälliger bei Updates von Proxmox oder Kernel. Wenn du dir unsicher bist, nimm die VM.

## 3. FritzBox: feste IP-Adresse für den Server

Die VM sollte immer dieselbe Adresse im Heimnetz haben, weil `BIND_ADDR`, Lesezeichen und das Handy darauf zeigen.

1. FritzBox-Oberfläche öffnen (`http://fritz.box`), anmelden.
2. **Heimnetz → Netzwerk**, das Gerät (die VM) in der Liste suchen und auf den Stift (Bearbeiten) klicken.
3. **„Diesem Netzwerkgerät immer die gleiche IPv4-Adresse zuweisen"** aktivieren und übernehmen.
4. Die Adresse notieren (z. B. `192.168.178.50`). Sie heißt in dieser Anleitung `<LAN-IP>`.

Bezeichnungen und Menüstruktur können je nach FRITZ!OS-Version abweichen. Die VM taucht erst in der Liste auf, wenn sie einmal gestartet war und Netzwerk hat. Die Adresse kannst du in der VM mit `ip -4 addr` prüfen.

## 4. Docker installieren

Installiere **Docker Engine mit dem Compose-Plugin** nach der offiziellen Anleitung für dein System, sie wird laufend aktualisiert:

- Debian: <https://docs.docker.com/engine/install/debian/>
- Ubuntu: <https://docs.docker.com/engine/install/ubuntu/>

Als Option bietet Docker ein Komfort-Skript an (nicht getestet in dieser Umgebung):

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
less get-docker.sh      # ansehen, bevor du es ausführst
sudo sh get-docker.sh
```

> Führe Skripte aus dem Internet erst aus, nachdem du sie dir angesehen hast.

Danach deinen Benutzer in die Gruppe `docker` aufnehmen (damit du kein `sudo` brauchst), einmal ab- und wieder anmelden und prüfen:

```bash
sudo usermod -aG docker $USER
# abmelden, neu anmelden, dann:
docker version
docker compose version
```

Git brauchst du auch: `sudo apt install git`.

## 5. App installieren und starten

Alle Befehle in diesem Dokument führst du im Repo-Verzeichnis auf dem Server aus (sofern nicht anders angegeben).

**1. Repo holen**

```bash
git clone <REPO-URL> FITWEBAPP
cd FITWEBAPP
```

**2. Konfiguration anlegen**

```bash
cp .env.example .env
nano .env
```

Mindestens setzen: `BIND_ADDR=<LAN-IP>` (Zeile mit `#` am Anfang einkommentieren). Optional `APP_PASSWORD`. Alle Variablen: [Abschnitt 6](#6-umgebungsvariablen).

**3. Bauen und starten**

```bash
docker compose up -d --build
```

Der erste Build lädt Basis-Images und Pakete und baut die App; das dauert auf einer kleinen VM einige Minuten. Im Build wird auch das native Modul `better-sqlite3` eingerichtet.

**4. Prüfen**

```bash
docker compose ps
docker compose logs --tail 50 app
curl http://<LAN-IP>:3000/api/health
```

Gut ist: Status `Up ... (healthy)` (in den ersten Sekunden `starting`, das ist normal) und die Antwort `{"ok":true}`. Dann im Browser `http://<LAN-IP>:3000` öffnen. Beim ersten Start erscheint ein Hinweis, den du bestätigst, danach ist die App mit Startkatalog und Standardprofilen benutzbar.

Wenn etwas nicht klappt: [Fehlersuche](#11-fehlersuche).

## 6. Umgebungsvariablen

Sie stehen in der Datei `.env` (Vorlage: `.env.example`). Nach jeder Änderung `docker compose up -d` ausführen, dadurch wird der Container mit den neuen Werten neu erstellt. Die Daten bleiben erhalten.

| Variable | Bedeutung | Standard |
| --- | --- | --- |
| `BIND_ADDR` | IP-Adresse des Docker-Hosts, an die der Port gebunden wird. **Deine LAN-IP, nie `0.0.0.0`.** | `127.0.0.1` (nur lokal) |
| `APP_PORT` | Port im Heimnetz | `3000` |
| `APP_PASSWORD` | Optional: Passwortschutz. Leer = kein Login. Gesetzt = Login-Seite, Sitzung 30 Tage. | leer |
| `DB_PATH` | Pfad der SQLite-Datei. Im Container fest `/data/fit.db`. In `.env` ist der Wert nur für die lokale Entwicklung relevant. | `./data/fit.db` (lokal) |
| `BACKUP_DIR` | Zielordner für `scripts/backup.sh` auf dem Host (wird nicht aus `.env` gelesen, beim Aufruf setzen) | `./backups` |
| `DOMAIN` | Nur HTTPS-Profil: Name unter dem die App erreichbar ist | – |

**Passwort ändern oder vergessen:** In `.env` neu setzen und `docker compose up -d` ausführen. Alle bisherigen Sitzungen werden dadurch ungültig, du musst dich neu anmelden. Ein vergessenes Passwort lässt sich so jederzeit einfach neu setzen. Verwende kein `$` im Passwort (Compose wertet es in `.env` aus).

**Zu viele Fehlversuche:** Nach fünf falschen Passwörtern innerhalb von fünf Minuten sperrt die Anmeldung eine Minute lang (für alle Geräte gemeinsam; ein Neustart des Containers hebt die Sperre auf).

**Hinweise zur Sperre und zu Sitzungen:** Wer die Anmeldeseite erreicht, kann die Anmeldung durch absichtlich falsche Passwörter immer wieder für eine Minute sperren (bestehende Sitzungen bleiben gültig). Im Heimnetz/VPN ist das vertretbar. Sitzungen lassen sich serverseitig nicht einzeln widerrufen: Ein Passwortwechsel macht alle ungültig. Mit HTTPS speichert der Service Worker besuchte Trainingsseiten auf dem Handy als Notfallfallback; der Knopf „Abmelden“ unter Einstellungen leert diesen Speicher.

**Passwort und HTTP:** Solange die App über HTTP aufgerufen wird, wird das Login-Cookie ohne `Secure`-Flag gesetzt (sonst würde der Browser es nicht speichern). Im Heimnetz oder VPN ist das akzeptabel, das Passwort wird aber unverschlüsselt übertragen. Mit HTTPS ([Anhang A](#12-anhang-a-https-optional-später)) wird das Cookie automatisch als `Secure` gesetzt (die App erkennt das am Header `X-Forwarded-Proto: https`, den Caddy setzt).

## 7. Zugriff vom Handy und per VPN

### iPhone

1. Im WLAN (oder per VPN) Safari öffnen: `http://<LAN-IP>:3000`.
2. Teilen-Symbol → **„Zum Home-Bildschirm"**. Die App öffnet sich danach im Vollbild.

Ohne HTTPS gilt für Browser kein „sicherer Kontext". Folgen:

- **Kein Service Worker, kein Offline-Fallback:** Ohne Netz (z. B. im Keller des Studios ohne Empfang, ohne Heimnetz/VPN) lädt die App nicht.
- **Kein Wake Lock:** Das Display geht nach der eingestellten Zeit aus. **Abhilfe:** In den iOS-Einstellungen die **Automatische Sperre** auf eine längere Zeit stellen (unter „Anzeige & Helligkeit", Bezeichnung je nach iOS-Version). Danach gern wieder zurückstellen.

Mit HTTPS ([Anhang A](#12-anhang-a-https-optional-später)) werden Service Worker (Offline-Fallback für die laufende Einheit) und Wake Lock aktiv.

### Android (Chrome)

Die Seite läuft normal im Browser. Die **Installation als App** braucht HTTPS (siehe Anhang A); ohne HTTPS kannst du ein Lesezeichen anlegen.

### Von unterwegs: FritzBox-WireGuard-VPN

Die App bleibt im Heimnetz, dein Handy verbindet sich per VPN mit der FritzBox und ist dann virtuell im Heimnetz. Dafür ist **keine Portfreigabe für die App** nötig. **Wichtig:** Die FritzBox muss aus dem Internet erreichbar sein. Dafür braucht sie eine erreichbare Adresse (MyFRITZ-Adresse oder DynDNS). Ob das bei deinem Anschluss geht, hängt vom Internetanbieter ab (bei DS-Lite/CGNAT ohne eigene öffentliche IPv4-Adresse kann das eingeschränkt sein). Das ist Voraussetzung und hier nicht getestet.

Grobe Schritte (nicht getestet; Bezeichnungen können je nach FRITZ!OS-Version abweichen):

1. FritzBox-Oberfläche: **Internet → Freigaben → VPN (WireGuard)** → **„Verbindung hinzufügen"**.
2. Option wie **„Einzelnen Rechner/Handy mit dem Heimnetz verbinden"** wählen (Wortlaut kann abweichen) und die Schritte des Assistenten durchlaufen.
3. Am Ende zeigt die FritzBox eine **Konfigurationsdatei und/oder einen QR-Code**. Auf dem Handy die **WireGuard-App** installieren und die Konfiguration importieren (QR-Code scannen oder Datei laden).
4. Zum Test das Handy **vom WLAN auf Mobilfunk umstellen**, die Verbindung in der WireGuard-App einschalten und dann `http://<LAN-IP>:3000` aufrufen.

Behandle Konfigurationsdatei und QR-Code wie ein Passwort (sie enthalten den Schlüssel des Handys).

## 8. Betrieb und Updates

Nützliche Befehle:

```bash
docker compose ps                     # Status (healthy?)
docker compose logs -f app            # Logs live ansehen (Strg+C beendet die Anzeige)
docker compose restart app            # Neustart
docker compose stop                   # anhalten
docker compose up -d                  # (wieder) starten
```

> **Vorsicht:** `docker compose down` ist unkritisch (das Volume bleibt), `docker compose down -v` **löscht das Volume und damit alle Daten**.

### Update

1. **Backup machen** ([Abschnitt 9](#9-datensicherung), mindestens `./scripts/backup.sh` und ein JSON-Export).
2. Neue Version holen und neu bauen:

   ```bash
   cd FITWEBAPP
   git pull
   docker compose up -d --build
   ```

3. Prüfen: `docker compose ps` (Status `healthy`) und `docker compose logs --tail 50 app`.

Die Daten im Volume bleiben erhalten; Migrationen laufen beim Start automatisch. Alte Images kannst du bei Bedarf mit `docker image prune -f` aufräumen.

**Rückgängig machen:** Eine ältere Version bekommst du mit `git checkout <alter-commit>` und erneutem `docker compose up -d --build`. Hat die neue Version aber bereits die Datenbank-Struktur geändert, spiele zusätzlich das Backup von vor dem Update ein ([Abschnitt 10](#10-wiederherstellung)).

**Neue Katalogversionen:** Der Seed legt nur **fehlende** Übungen und Profile an und überschreibt nie deine Änderungen. Übungen, die eine neue Version im Startkatalog ändert oder ergänzt, erreichen eine bestehende Installation daher nicht von selbst. Wenn du sie übernehmen willst: Auf einer frischen Installation (z. B. lokal oder einer zweiten Instanz mit neuer Datenbank) in der App **Einstellungen → Datensicherung → „Nur den Katalog exportieren"**, die Datei in der produktiven App mit dem Katalogimport einlesen (er **führt zusammen**). Mache vorher ein Backup und prüfe das Ergebnis im Katalog.

Wenn du das HTTPS-Profil nutzt, muss jeder dieser Befehle mit denselben `-f`- und `--profile`-Angaben aufgerufen werden (oder mit `COMPOSE_FILE`/`COMPOSE_PROFILES` in `.env`), siehe Anhang A.

## 9. Datensicherung

Es gibt drei Ebenen, die sich ergänzen. Empfehlung: Ebene 1 und 2 automatisch, Ebene 3 gelegentlich und vor Updates.

### Ebene 1: Proxmox-VM-Backup

Im Proxmox-Web-Interface unter **Datacenter → Backup** einen Job für die VM anlegen (Modus „Snapshot", Ziel-Speicher und Zeitplan wählen; Bezeichnungen können je nach Version abweichen). Das sichert alles: System, Docker, Image und Daten.

Hinweis: Die Datenbank läuft im WAL-Modus. Ein VM-Snapshot im laufenden Betrieb ist **crash-konsistent**: SQLite stellt beim nächsten Start einen konsistenten Zustand her, ein kleines Risiko, die letzten Sekunden zu verlieren, bleibt. Ebene 2 liefert zusätzlich eine saubere Datenbankkopie.

### Ebene 2: Datenbank-Skript

Das Image enthält kein `sqlite3`-Programm, deshalb läuft die Sicherung über ein Skript der App.

```bash
./scripts/backup.sh
```

Das Skript läuft auf dem **Host** im Repo-Verzeichnis. Es ruft `docker compose exec -T app node scripts/backup-db.cjs` auf (die Sicherung entsteht im Container im Volume unter `/data/backup/`, es werden die letzten 14 Sicherungen behalten) und kopiert die Sicherungen mit `docker compose cp` nach `${BACKUP_DIR:-./backups}`. Die Dateien heißen `fit-JJJJ-MM-TT-HHMMSS.db`. Das Skript liest die Datei `.env` **nicht**: einen anderen Zielordner gibst du beim Aufruf an (`BACKUP_DIR=/mnt/nas/fit ./scripts/backup.sh`, im Cron-Eintrag entsprechend davor). Im Zielordner auf dem Host werden alte Dateien nicht automatisch gelöscht, räume ihn gelegentlich auf. Details stehen im Kopf des Skripts.

**Täglich nachts per Cron** (Beispiel, Pfad und Uhrzeit anpassen):

```bash
crontab -e
```

```cron
30 3 * * * cd /home/<benutzer>/FITWEBAPP && ./scripts/backup.sh >> backup.log 2>&1
```

Der Benutzer, dem die Cron-Tabelle gehört, muss Docker benutzen dürfen (Gruppe `docker`). Der Container `app` muss laufen. Kontrolliere nach dem ersten Lauf, ob in `backups/` eine Datei liegt und `backup.log` keine Fehler zeigt.

> Eine Sicherung auf demselben Datenträger schützt nicht vor einem Plattendefekt. Setze `BACKUP_DIR` auf ein NAS-Laufwerk oder kopiere `backups/` regelmäßig woandershin (Ebene 1 hilft hier ebenfalls, wenn der Backup-Speicher woanders liegt).

### Ebene 3: Export in der App

**Einstellungen → Datensicherung:**

- **„Alle Daten exportieren"**: JSON mit Katalog, Profilen, Einstellungen, Plänen, Einheiten und allen Sätzen.
- **„Nur den Katalog exportieren"**: nur die Übungen mit deinen Änderungen.

Die Dateien sind **nicht verschlüsselt**: Bewahre sie so auf, wie du es mit Gesundheits- und Trainingsdaten tun würdest. Die Export-Datei lässt sich auch am Handy speichern, praktisch für einen Export vor einem Update.

## 10. Wiederherstellung

**Aus dem App-Export (JSON):** Einstellungen → Datensicherung:

- **„Alle Daten importieren"** (Datei bis 20 MB): ersetzt **alle** aktuellen Daten, mit Bestätigung. Exportiere vorher den aktuellen Stand.
- **„Katalog importieren"**: führt Übungen mit dem bestehenden Katalog zusammen.

**Aus einer Datenbank-Sicherung (`.db`-Datei):** Die Datei muss im Volume als `/data/fit.db` liegen. Sicheres Vorgehen mit einem Hilfscontainer (aus dem App-Image, läuft als derselbe Benutzer wie die App, sodass die Dateirechte stimmen):

```bash
ls backups/                       # Dateiname der gewünschten Sicherung ermitteln
docker compose stop app

docker compose run --rm --no-deps \
  -v "$PWD/backups:/backups:ro" \
  -e DATEI=DATEINAME.db \
  --entrypoint sh app -c '
    set -e
    # Alten Stand komplett beiseitelegen (inkl. noch nicht eingecheckter Schreibvorgänge im WAL)
    for f in fit.db fit.db-wal fit.db-shm; do
      [ -f "/data/$f" ] && mv "/data/$f" "/data/$f.vor-restore" || true
    done
    cp "/backups/$DATEI" /data/fit.db
  '

docker compose up -d
docker compose ps
```

Erklärung: `DATEINAME.db` durch den echten Namen ersetzen (liegt die Sicherung in einem anderen Ordner als `./backups`, passe den Pfad bei `-v` an). Die alte Datenbank bleibt vorsichtshalber als `/data/fit.db.vor-restore` (zusammen mit `…-wal.vor-restore` und `…-shm.vor-restore`) im Volume liegen. Wichtig ist, **vorher den Container zu stoppen** und die Dateien `fit.db-wal`/`fit.db-shm` beiseitezulegen: Sie gehören zur alten Datenbank und würden sonst mit der zurückgespielten Datei vermischt.

Nach dem Start prüfen, ob die Daten stimmen. Danach kannst du die Datei `fit.db.vor-restore` bei Bedarf mit einem weiteren Hilfscontainer löschen (`rm /data/fit.db.vor-restore`).

**Aus einem Proxmox-Backup:** In Proxmox das Backup der VM wiederherstellen („Restore"), VM starten, fertig. Die Adresse im Heimnetz ändert sich nur, wenn die MAC-Adresse der VM eine andere ist (feste IP in der FritzBox).

## 11. Fehlersuche

| Symptom | Was du prüfst |
| --- | --- |
| **Build-Fehler bei `better-sqlite3`** (Ausgabe mit `node-gyp`, `gyp ERR!`, `make` oder `g++`) in der Phase `npm ci` | Das Dockerfile installiert Build-Werkzeuge (`python3 make g++`) für den Fall, dass kein fertiges Binary passt. Prüfe, ob die VM ins Internet kommt (DNS, Proxy), und poste die letzten 30 Zeilen der Ausgabe, wenn du Hilfe holst. Nach einer Korrektur: `docker compose build --no-cache`. |
| **Build bricht mit `Killed` / Exit-Code 137 ab** | Zu wenig Arbeitsspeicher. Mehr RAM für die VM oder Swap (siehe [Abschnitt 2](#2-proxmox-vm-anlegen)). |
| **Fehler `cannot assign requested address`** beim Start | `BIND_ADDR` zeigt auf eine IP, die die VM nicht hat. Mit `ip -4 addr` die richtige Adresse prüfen. |
| **Port belegt** (`address already in use`) | `APP_PORT` in `.env` ändern, `docker compose up -d`. |
| **Status `unhealthy` oder `starting` bleibt** | `docker compose logs --tail 100 app`. Der Healthcheck ruft alle 30 s `GET /api/health` auf (Startphase 15 s). `{"ok":false}`/Status 503 bedeutet: Datenbank nicht erreichbar. |
| **Container startet ständig neu** (`Restarting` in `docker compose ps`) | Im Log nach `Datenbank-Initialisierung fehlgeschlagen (Migration/Seed)` suchen: die App beendet sich absichtlich, wenn Migration oder Seed scheitern. Die Fehlermeldung darunter nennt den Grund (z. B. beschädigte Datei, Rechte auf `/data`). |
| **Seite nicht erreichbar** | `curl http://<LAN-IP>:3000/api/health` auf dem Server. Klappt das dort, aber nicht vom Handy: stimmt `BIND_ADDR`? Gleiches WLAN? VPN an? Firewall in der VM? (Docker umgeht `ufw`-Regeln beim Veröffentlichen von Ports. Die Absicherung ist die Bindung über `BIND_ADDR`.) |
| **Login klappt nicht** | Passwort in `.env` prüfen (kein `$`, keine Anführungszeichen-Probleme), `docker compose up -d` ausführen, Cookies der Seite im Browser löschen. |
| **Import wird mit „Forbidden" abgelehnt** | Die App prüft Origin und Host. Rufe sie unter der Adresse auf, die der Browser sieht; hinter einem Proxy muss `Host` bzw. `X-Forwarded-Host` korrekt durchgereicht werden (Caddy tut das standardmäßig). |

## 12. Anhang A: HTTPS (optional, später)

Mit HTTPS gilt die Seite als sicherer Kontext. Folgen:

- **Service Worker** wird registriert: Offline-Fallback für die laufende Einheit.
- **Wake Lock** wird aktiv: Das Display bleibt während des Trainings an.
- Die App kann auf Android/Chrome als App **installiert** werden.
- Das Login-Cookie wird automatisch mit `Secure`-Flag gesetzt.

Dafür ergänzt `docker-compose.https.yml` einen Caddy-Dienst (Reverse-Proxy), der auf Port 443 lauscht und an `app:3000` weiterleitet. Der Caddy-Port wird wie der App-Port an `BIND_ADDR` gebunden, also **nur im Heimnetz, nicht im Internet**. Eine Portfreigabe in der FritzBox ist weiterhin nicht nötig. `Host` und `X-Forwarded-Host` werden korrekt durchgereicht (Caddy macht das standardmäßig, die App benötigt das beim Import).

Starten:

```bash
# in .env: DOMAIN=<name-oder-ip>
docker compose -f docker-compose.yml -f docker-compose.https.yml --profile https up -d
```

Praktisch: In `.env` einmalig `COMPOSE_FILE=docker-compose.yml:docker-compose.https.yml` und `COMPOSE_PROFILES=https` setzen, dann genügt überall `docker compose ...`. Das gilt auch für Updates (`docker compose up -d --build`), sonst wird Caddy nicht berücksichtigt. Wichtig: Mit der Datei `docker-compose.https.yml` verlangt Compose, dass `DOMAIN` gesetzt ist.

**Port der App (HTTP):** Empfehlung: unverändert lassen. `http://<LAN-IP>:3000` bleibt als Rückfallebene im Heimnetz erreichbar, die Bindung an `BIND_ADDR` ist ohnehin der Schutz. Wer HTTP ganz schließen will, kann in einer eigenen `docker-compose.override.yml` den Port der App auf `127.0.0.1` legen (benötigt eine neuere Compose-Version für `!override`, nicht getestet):

```yaml
services:
  app:
    ports: !override
      - "127.0.0.1:${APP_PORT:-3000}:3000"
```

Damit der Name aufgelöst wird, muss `DOMAIN` im Heimnetz auf die LAN-IP des Servers zeigen. Zwei Wege für das Zertifikat:

### Weg (b): `tls internal` (Caddys eigene CA), einfacher (nicht getestet)

Das ist die Voreinstellung im `Caddyfile`. Es ist kein DNS-Anbieter nötig. Als `DOMAIN` kannst du einen Namen verwenden, der im Heimnetz auflösbar ist, oder die LAN-IP selbst (`DOMAIN=192.168.178.50`, nicht getestet).

Browser und Handy kennen die Caddy-CA nicht, das Root-Zertifikat muss einmalig installiert werden:

1. Zertifikat aus dem Container holen (nach dem ersten Start):

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.https.yml --profile https \
     cp caddy:/data/caddy/pki/authorities/local/root.crt ./caddy-root.crt
   ```

2. `caddy-root.crt` aufs iPhone bringen (z. B. AirDrop, E-Mail oder Dateiablage) und öffnen. iOS meldet ein geladenes Profil: **Einstellungen → Profil geladen → Installieren**.
3. **Einstellungen → Allgemein → Info → Zertifikatsvertrauenseinstellungen** und dort das Caddy-Zertifikat für vollständiges Vertrauen **aktivieren**.
4. In Safari `https://<DOMAIN>` aufrufen. Dann „Zum Home-Bildschirm" neu anlegen, falls du die HTTP-Variante schon hattest.

Hinweise: Bezeichnungen können je nach iOS-Version abweichen. Das Root-Zertifikat liegt im Volume `caddy-data`. Wird es gelöscht, entsteht beim nächsten Start ein neues, und du musst es erneut installieren. Gib nur die Datei `root.crt` weiter, nie den privaten Schlüssel (liegt im selben Ordner).

### Weg (a): eigene Domain und DNS-Challenge, vertrauenswürdiges Zertifikat (nicht getestet)

Du besitzt eine Domain (z. B. `fit.example.org`) bei einem DNS-Anbieter mit API. Caddy bekommt von Let's Encrypt ein **echtes** Zertifikat über die DNS-Challenge, dafür muss kein Port aus dem Internet erreichbar sein. Alle Geräte vertrauen dem Zertifikat ohne weitere Installation.

1. **Eigenes Caddy-Image mit DNS-Plugin bauen.** Standard-Caddy kann die DNS-Challenge deines Anbieters nicht; das Plugin kommt über `xcaddy` (Beispiel Cloudflare; andere Anbieter: Module unter `github.com/caddy-dns/`):

   ```bash
   mkdir caddy-dns && cd caddy-dns
   cat > Dockerfile <<'EOF'
   FROM caddy:builder AS builder
   RUN xcaddy build --with github.com/caddy-dns/cloudflare

   FROM caddy:2
   COPY --from=builder /usr/bin/caddy /usr/bin/caddy
   EOF
   docker build -t caddy-dns:local .
   cd ..
   ```

2. In `.env` eintragen:

   ```text
   DOMAIN=fit.example.org
   CADDY_IMAGE=caddy-dns:local
   DNS_API_TOKEN=<API-Token deines DNS-Anbieters, nur DNS-Rechte für diese Zone>
   ```

3. Im `Caddyfile` die Zeile `tls internal` auskommentieren und den Block `tls { dns cloudflare {env.DNS_API_TOKEN} }` einkommentieren (Anbietername und Token-Syntax je nach Plugin, siehe dessen Dokumentation).
4. **Name im Heimnetz auflösen:** `DOMAIN` muss intern auf die LAN-IP zeigen. Zwei Möglichkeiten: ein `A`-Eintrag bei deinem DNS-Anbieter mit der privaten LAN-IP (für das Handy die praktikable Variante, da auf dem iPhone keine hosts-Datei möglich ist; die FritzBox blockiert solche Antworten standardmäßig durch den **DNS-Rebind-Schutz**, für den Namen musst du eine Ausnahme eintragen, in den Netzwerkeinstellungen der FritzBox, Bezeichnung je nach FRITZ!OS-Version), oder ein lokaler Eintrag (hosts-Datei am PC, bzw. Eintrag im lokalen DNS, sofern deine FRITZ!OS-Version das anbietet).
5. Starten wie oben mit `--profile https`.

### Typische Probleme bei HTTPS

- Im Caddy-Log (`docker compose ... logs caddy`) stehen Zertifikatsfehler: bei Weg (a) Token, Plugin-Name und DNS-Zone prüfen.
- Safari zeigt eine Zertifikatswarnung: bei Weg (b) fehlt die Installation/Aktivierung des Root-Zertifikats, oder `DOMAIN` passt nicht zu der Adresse im Browser.
- Der Import in der App meldet „Forbidden": Prüfe, ob du die App über die Caddy-Adresse aufrufst; `Host`/`X-Forwarded-Host` müssen zur Adresse in der Adresszeile passen.
