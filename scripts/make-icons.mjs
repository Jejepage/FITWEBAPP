// Erzeugt die PNG-Symbole der App (Manifest, iPhone-Home-Bildschirm) aus dem Hantel-Symbol von
// src/app/icon.svg. Aufruf: node scripts/make-icons.mjs  (nutzt das vorinstallierte Chromium,
// Pfad per CHROMIUM_PATH änderbar). Die erzeugten Dateien liegen in public/ und sind eingecheckt.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const FARBE = "#0f766e";
const HANTEL = `
  <rect x="10" y="26" width="6" height="12" rx="2" fill="#fff"/>
  <rect x="18" y="20" width="6" height="24" rx="2" fill="#fff"/>
  <rect x="24" y="30" width="16" height="4" fill="#fff"/>
  <rect x="40" y="20" width="6" height="24" rx="2" fill="#fff"/>
  <rect x="48" y="26" width="6" height="12" rx="2" fill="#fff"/>`;

/** Abgerundetes Symbol wie icon.svg (transparente Ecken). */
const rund = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${FARBE}"/>${HANTEL}</svg>`;
/** Randlos: iOS und Android runden selbst; transparente Ecken würden schwarz. */
const voll = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${FARBE}"/>${HANTEL}</svg>`;
/** Maskierbar: Motiv im inneren Sicherheitsbereich (ca. 70 %). */
const maskierbar = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${FARBE}"/>
  <g transform="translate(32 32) scale(0.7) translate(-32 -32)">${HANTEL}</g></svg>`;

const ZIELE = [
  ["icon-192.png", rund, 192, true],
  ["icon-512.png", rund, 512, true],
  ["icon-maskable-512.png", maskierbar, 512, false],
  ["apple-touch-icon.png", voll, 180, false],
];

const ordner = join(import.meta.dirname, "..", "public");
mkdirSync(ordner, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"],
});
try {
  for (const [datei, svg, groesse, transparent] of ZIELE) {
    const page = await browser.newPage({ viewport: { width: groesse, height: groesse } });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${groesse}px;height:${groesse}px}</style>${svg}`,
    );
    await page.screenshot({ path: join(ordner, datei), omitBackground: transparent });
    await page.close();
    console.log(`public/${datei} (${groesse}×${groesse})`);
  }
} finally {
  await browser.close();
}

// favicon.ico: ICO-Container mit dem 192-px-PNG (moderne Browser lesen PNG-in-ICO). Manche
// Browser fragen /favicon.ico unabhängig vom <link rel="icon"> an; so antwortet die App mit 200.
const png = readFileSync(join(ordner, "icon-192.png"));
const kopf = Buffer.alloc(22);
kopf.writeUInt16LE(0, 0); // reserviert
kopf.writeUInt16LE(1, 2); // Typ: Symbol
kopf.writeUInt16LE(1, 4); // ein Bild
kopf.writeUInt8(192, 6); // Breite
kopf.writeUInt8(192, 7); // Höhe
kopf.writeUInt16LE(1, 10); // Farbebenen
kopf.writeUInt16LE(32, 12); // Bit pro Pixel
kopf.writeUInt32LE(png.length, 14); // Größe der Bilddaten
kopf.writeUInt32LE(22, 18); // Offset der Bilddaten
writeFileSync(join(ordner, "favicon.ico"), Buffer.concat([kopf, png]));
console.log("public/favicon.ico");
