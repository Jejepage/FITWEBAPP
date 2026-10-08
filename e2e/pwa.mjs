// Browsertest für PWA und Notfallfallback (Abschnitt 9): Manifest, Service Worker nur im sicheren
// Kontext, laufende Einheit bei Netzausfall. 127.0.0.1 gilt für Chromium als sicherer Kontext, die
// LAN-Adresse (HTTP) nicht – genau wie später im Heimnetz.
// Anfragen des Service Workers sollen für context.route sichtbar sein (Netzausfall wirklich testen).
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
import assert from "node:assert/strict";
import { join } from "node:path";
import Database from "better-sqlite3";
import {
  PORT,
  SHOTS,
  hinweisBestaetigen,
  sammleFehler,
  withApp,
} from "./harness.mjs";

const schritt = (s) => console.log(`  ${s}`);

async function ablauf(browser, lanBase, dbPfad) {
  const sicher = `http://127.0.0.1:${PORT}`;
  /** Netzausfall: auch die Anfragen des Service Workers brechen ab (setOffline allein erfasst sie nicht). */
  const offline = async (context, an) => {
    if (an) {
      await context.setOffline(true);
      await context.route("**/*", (route) =>
        route.abort("internetdisconnected"),
      );
    } else {
      // Erst die Abbruch-Regel entfernen, dann das Netz freigeben: Das "online"-Ereignis löst sofort
      // einen neuen Sendeversuch aus, der sonst in der gerade entfernten Regel hängen bleiben kann.
      await context.unroute("**/*");
      await context.setOffline(false);
    }
  };
  const zaehle = () => {
    const d = new Database(dbPfad, { readonly: true });
    const n = d.prepare("select count(*) c from set_log").get().c;
    d.close();
    return n;
  };

  // --- 1. Unsicherer Kontext (HTTP über die LAN-Adresse): kein Service Worker, App läuft normal --
  const ctxHttp = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const http = await ctxHttp.newPage();
  const fehlerHttp = sammleFehler(http);
  await hinweisBestaetigen(http, lanBase);
  assert.equal(await http.evaluate(() => window.isSecureContext), false);
  assert.equal(
    await http.evaluate(() => typeof navigator.serviceWorker),
    "undefined",
  );
  assert.equal(
    await http.evaluate(() => typeof navigator.wakeLock),
    "undefined",
  );
  assert.equal(await http.locator('link[rel="manifest"]').count(), 1);
  assert.equal(await http.locator('link[rel="apple-touch-icon"]').count(), 1);
  assert.ok(
    (await http.locator('link[rel="icon"]').count()) >= 1,
    "Browser-Symbol verlinkt",
  );
  assert.equal(
    (await http
      .locator(
        'meta[name="mobile-web-app-capable"], meta[name="apple-mobile-web-app-capable"]',
      )
      .count()) >= 1,
    true,
  );
  await http.goto(`${lanBase}/einstellungen`);
  await http
    .getByRole("heading", { name: "App auf dem Handy installieren", level: 2 })
    .waitFor();
  await http.getByText(/Zum Home-Bildschirm/).waitFor();
  assert.ok(
    await http.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "kein Scrollen",
  );
  await http.screenshot({
    path: join(SHOTS, "pwa-1-installieren.png"),
    fullPage: true,
  });
  assert.deepEqual(fehlerHttp, []);
  await ctxHttp.close();
  schritt(
    "HTTP/LAN: kein Service Worker, kein Wake Lock, Manifest und Symbole verlinkt, Installationshinweis",
  );

  // --- 2. Sicherer Kontext: Service Worker registriert sich --------------------------------------
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();
  const fehler = sammleFehler(page);
  await page.goto(`${sicher}/`); // Hinweis ist über die DB schon bestätigt
  await page.goto(`${sicher}/plan/neu`);
  await page
    .getByRole("button", { name: "Plan speichern und aktivieren" })
    .click();
  await page
    .getByRole("heading", { name: "Plan", level: 1, exact: true })
    .waitFor();
  await page.goto(`${sicher}/`);
  await page.getByRole("button", { name: "Training starten" }).click();
  await page.getByRole("button", { name: "Aufwärmen erledigt" }).click();
  await page.getByRole("button", { name: "Satz erledigt" }).waitFor();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // ab jetzt steuert der Service Worker die Seite
  await page.getByRole("button", { name: "Aufwärmen erledigt" }).click();
  await page.getByRole("button", { name: "Satz erledigt" }).waitFor();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  schritt("127.0.0.1 (sicherer Kontext): Service Worker registriert und aktiv");

  // --- 3. Erster Satz online, Notfall-Cache der Trainingsseite wird aufgefrischt ---------------------
  await page.getByRole("button", { name: "Satz erledigt" }).click();
  await page.getByText("1 von 18 Sätzen").first().waitFor();
  // Der Service Worker frischt den Cache nach dem Speichern auf; erst warten, bis das geschehen ist.
  // (waitForFunction wartet nicht auf asynchrone Prüfungen, daher eine eigene Schleife.)
  const stand = async () =>
    page.evaluate(async () => {
      const c = await caches.open("fit-v3-seiten");
      const t = await (await c.match(location.pathname))?.text();
      return Boolean(t && t.includes("1 von 18 Sätzen"));
    });
  for (let i = 0; i < 150 && !(await stand()); i++)
    await page.waitForTimeout(100);
  assert.ok(
    await stand(),
    "Cache der Trainingsseite wurde nach dem Satz aufgefrischt",
  );
  const gecacht = await page.evaluate(async () => {
    const c = await caches.open("fit-v3-seiten");
    return (await c.keys()).map((r) => new URL(r.url).pathname);
  });
  assert.ok(gecacht.includes("/offline.html"));
  assert.ok(gecacht.some((p) => p.startsWith("/training/")));
  assert.ok(
    !gecacht.some((p) => p.startsWith("/api/")),
    "keine API-Antworten im Cache",
  );
  schritt(
    "Trainingsseite und /offline.html liegen im Cache, der Stand wird nach jedem Satz aufgefrischt",
  );

  // --- 4. Netzausfall: Seite lädt aus dem Cache, Satz bleibt lokal und wird später gespeichert -------
  assert.equal(zaehle(), 1);
  await offline(context, true);
  await page.reload();
  await page.getByRole("button", { name: "Satz erledigt" }).waitFor();
  await page.getByText("1 von 18 Sätzen").first().waitFor();
  await page.screenshot({
    path: join(SHOTS, "pwa-2-offline-training.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Satz erledigt" }).click();
  await page.getByText(/noch nicht gespeichert/).waitFor();
  assert.equal(zaehle(), 1, "offline wurde nichts gespeichert");
  await offline(context, false);
  await page
    .getByText(/noch nicht gespeichert/)
    .waitFor({ state: "detached", timeout: 20000 });
  assert.equal(zaehle(), 2, "nach Rückkehr des Netzes gespeichert");
  schritt(
    "Offline: laufende Einheit lädt aus dem Cache, Satz wird nach Rückkehr des Netzes gespeichert",
  );

  // --- 5. Nicht gecachte Seite ohne Netz: Offline-Seite --------------------------------------------
  await offline(context, true);
  await page.goto(`${sicher}/verlauf`);
  await page
    .getByRole("heading", { name: "Keine Verbindung", level: 1 })
    .waitFor();
  await page.screenshot({
    path: join(SHOTS, "pwa-3-offline-seite.png"),
    fullPage: true,
  });
  await offline(context, false);
  schritt("Nicht gecachte Seite ohne Netz zeigt die Offline-Seite");

  // --- 6. Statische Dateien kommen aus dem Cache; Caches lassen sich leeren ------------------------
  const statisch = await page.evaluate(async () => {
    const c = await caches.open("fit-v3-static");
    return (await c.keys()).length;
  });
  assert.ok(statisch > 0, "statische Dateien gecacht");
  await page.evaluate(async () => {
    for (const n of await caches.keys()) await caches.delete(n);
  });
  assert.deepEqual(await page.evaluate(() => caches.keys()), []);
  assert.deepEqual(
    fehler.filter(
      (f) => !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(f),
    ),
    [],
  );
  await context.close();
  schritt(
    `${statisch} statische Dateien im Cache, Caches vollständig löschbar`,
  );
}

console.log("Mobil (390×844)");
await withApp(({ browser, BASE, dbPfad }) => ablauf(browser, BASE, dbPfad), {
  lan: true,
});
