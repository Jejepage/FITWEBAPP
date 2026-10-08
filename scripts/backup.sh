#!/usr/bin/env bash
# Sicherung der Datenbank vom Docker-Host aus (für Cron gedacht).
#   ./scripts/backup.sh            # Sicherungen landen in ./backups (oder $BACKUP_DIR)
# Ablauf: konsistente Kopie im Container (/data/backup, die letzten 14 bleiben dort), danach
# Kopie auf den Host. Ausführen im Repo-Verzeichnis (dort liegt die docker-compose.yml).
set -euo pipefail

cd "$(dirname "$0")/.."
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

docker compose exec -T app node scripts/backup-db.cjs /data/backup 14
docker compose cp app:/data/backup/. "$BACKUP_DIR"
echo "Sicherungen in $BACKUP_DIR:"
ls -1 "$BACKUP_DIR" | tail -n 5
