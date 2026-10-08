#!/usr/bin/env node
// Konsistente Online-Sicherung der SQLite-Datenbank (auch während die App läuft), über die
// Backup-Funktion von better-sqlite3. Im Container aufgerufen von scripts/backup.sh:
//   node scripts/backup-db.cjs [Zielordner=/data/backup] [Anzahl behalten=14]
// Umgebung: DB_PATH (Standard /data/fit.db).
const Database = require("better-sqlite3");
const fs = require("node:fs");
const path = require("node:path");

const quelle = process.env.DB_PATH || "/data/fit.db";
const ziel = process.argv[2] || path.join(path.dirname(quelle), "backup");
const behalten = Math.max(1, Number.parseInt(process.argv[3] || "14", 10) || 14);

function stempel(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function main() {
  fs.mkdirSync(ziel, { recursive: true });
  const datei = path.join(ziel, `fit-${stempel(new Date())}.db`);
  const db = new Database(quelle, { fileMustExist: true });
  try {
    await db.backup(datei);
  } finally {
    db.close();
  }
  // Ältere Sicherungen aufräumen: die neuesten `behalten` bleiben
  const alle = fs
    .readdirSync(ziel)
    .filter((n) => /^fit-\d{4}-\d{2}-\d{2}-\d{6}\.db$/.test(n))
    .sort();
  for (const alt of alle.slice(0, Math.max(0, alle.length - behalten))) {
    fs.rmSync(path.join(ziel, alt));
  }
  console.log(datei);
}

main().catch((e) => {
  console.error("Sicherung fehlgeschlagen:", e.message);
  process.exit(1);
});
