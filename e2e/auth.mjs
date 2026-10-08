// Browsertest für den optionalen Passwortschutz (APP_PASSWORD, Abschnitt 9).
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { join } from "node:path";
import { SHOTS, sammleFehler, withApp } from "./harness.mjs";

const PASSWORT = "e2e-geheim";
const schritt = (s) => console.log(`  ${s}`);

/** Cookie-Wert wie in src/server/auth.ts (für gefälschte und abgelaufene Tokens im Test). */
function token(passwort, ablaufSek) {
  const key = createHash("sha256").update(`fit-session-v1:${passwort}`).digest();
  return `${ablaufSek}.${createHmac("sha256", key).update(String(ablaufSek)).digest("hex")}`;
}

async function ablauf(browser, base) {
  const roh = (pfad, o = {}) => fetch(`${base}${pfad}`, { redirect: "manual", ...o });

  // --- 1. Ohne Anmeldung: Seiten leiten um, Programmaufrufe bekommen 401 ------------------
  let r = await roh("/");
  assert.equal(r.status, 307);
  assert.equal(r.headers.get("location"), "/login");
  r = await roh("/verlauf?alle=1");
  assert.equal(r.headers.get("location"), "/login?weiter=%2Fverlauf%3Falle%3D1");
  assert.equal((await roh("/api/export?art=alles")).status, 401);
  assert.equal((await roh("/api/import", { method: "POST" })).status, 401);
  for (const frei of [
    "/api/health",
    "/manifest.webmanifest",
    "/sw.js",
    "/icon-192.png",
    "/offline",
  ]) {
    assert.equal((await roh(frei)).status, 200, `${frei} bleibt frei`);
  }
  schritt("Ohne Cookie: Seiten → /login, Export/Import → 401, Health/Manifest/Icons/sw.js frei");

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();
  const fehler = sammleFehler(page);
  const shot = (n) => page.screenshot({ path: join(SHOTS, `auth-${n}.png`), fullPage: true });
  const anmelden = async (pw) => {
    await page.getByLabel("Passwort").fill(pw);
    await page.getByRole("button", { name: "Anmelden" }).click();
  };

  // --- 2. Anmeldeseite: kein Menü, falsches Passwort ----------------------------------------
  await page.goto(`${base}/verlauf?alle=1`);
  await page.getByRole("heading", { name: "Anmelden", level: 1 }).waitFor();
  assert.ok(page.url().includes("weiter=%2Fverlauf%3Falle%3D1"));
  assert.equal(
    await page.getByRole("navigation", { name: "Hauptnavigation" }).count(),
    0,
    "kein Menü vor der Anmeldung",
  );
  assert.equal(
    await page.getByRole("button", { name: "Verstanden" }).count(),
    0,
    "keine Hinweisseite vor der Anmeldung",
  );
  await shot("1-login");
  await anmelden("falsch");
  await page.getByText("Das Passwort stimmt nicht.").waitFor();
  assert.deepEqual(
    (await context.cookies()).filter((c) => c.name === "fit_session"),
    [],
  );
  schritt("Anmeldeseite ohne Menü; falsches Passwort wird abgelehnt, kein Cookie");

  // --- 3. Richtiges Passwort: Weiterleitung, Cookie-Eigenschaften -----------------------------
  await page.goto(`${base}/login?weiter=%2Fverlauf%3Falle%3D1`);
  await anmelden(PASSWORT);
  await page.getByRole("button", { name: "Verstanden" }).click(); // Hinweis beim ersten Start
  await page.getByRole("heading", { name: "Verlauf", level: 1 }).waitFor();
  assert.ok(page.url().endsWith("/verlauf?alle=1") || page.url().endsWith("/verlauf"), page.url());
  const cookie = (await context.cookies()).find((c) => c.name === "fit_session");
  assert.ok(cookie, "Sitzungs-Cookie gesetzt");
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.secure, false, "über HTTP ohne Secure-Flag (sonst verwirft der Browser es)");
  assert.equal(cookie.sameSite, "Lax");
  const tage = (cookie.expires - Date.now() / 1000) / 86400;
  assert.ok(tage > 29 && tage < 31, `Laufzeit ${tage} Tage`);
  assert.ok(
    !(await page.evaluate(() => document.cookie)).includes("fit_session"),
    "nicht per JavaScript lesbar",
  );
  schritt("Anmeldung leitet auf den Zielpfad, Cookie HttpOnly/Lax/30 Tage, ohne Secure über HTTP");

  // --- 4. Angemeldet: App läuft wie ohne Passwort (Server Actions, Export) --------------------
  await page.goto(`${base}/plan/neu`);
  await page.getByRole("button", { name: "Plan speichern und aktivieren" }).click();
  await page.getByRole("heading", { name: "Plan", level: 1, exact: true }).waitFor();
  await page.goto(`${base}/`);
  await page.getByRole("button", { name: "Training starten" }).click();
  await page.getByRole("button", { name: "Aufwärmen erledigt" }).click();
  await page.getByRole("button", { name: "Satz erledigt" }).click();
  await page.getByRole("button", { name: "Satz erledigt" }).waitFor();
  const export_ = await page.request.get(`${base}/api/export?art=alles`);
  assert.equal(export_.status(), 200);
  assert.equal((await export_.json()).format, "fit-backup");
  const fremd = await page.request.post(`${base}/api/import`, {
    headers: { Origin: "http://evil.example" },
    multipart: {
      art: "katalog",
      datei: { name: "x.json", mimeType: "application/json", buffer: Buffer.from("{}") },
    },
    maxRedirects: 0,
  });
  assert.equal(fremd.status(), 403, "fremde Herkunft bleibt auch mit Sitzung gesperrt");
  schritt("Angemeldet: Plan speichern, Training, Satz speichern und Export funktionieren");

  // --- 5. Gefälschte und abgelaufene Cookies ---------------------------------------------------
  const jetzt = Math.floor(Date.now() / 1000);
  const faelle = {
    "Token mit fremdem Passwort": token("anderes", jetzt + 86400),
    "abgelaufenes Token": token(PASSWORT, jetzt - 10),
    "veränderte Ablaufzeit": cookie.value.replace(/^\d+/, String(jetzt + 99999999)),
    "kaputtes Format": "unsinn",
  };
  for (const [name, wert] of Object.entries(faelle)) {
    const r2 = await roh("/", { headers: { Cookie: `fit_session=${wert}` } });
    assert.equal(r2.status, 307, name);
    const r3 = await roh("/api/export", { headers: { Cookie: `fit_session=${wert}` } });
    assert.equal(r3.status, 401, name);
  }
  schritt("Gefälschte, abgelaufene und veränderte Cookies werden abgelehnt");

  // --- 6. Weiterleitung nur auf interne Pfade ---------------------------------------------------
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  for (const boese of ["//evil.example/x", "https://evil.example", "/\\evil.example"]) {
    await p2.goto(`${base}/login?weiter=${encodeURIComponent(boese)}`);
    await p2.getByLabel("Passwort").fill(PASSWORT);
    await p2.getByRole("button", { name: "Anmelden" }).click();
    await p2.getByRole("heading", { name: "Start", level: 1 }).waitFor();
    assert.equal(new URL(p2.url()).origin, new URL(base).origin, `Weiterleitung bei ${boese}`);
    assert.equal(new URL(p2.url()).pathname, "/");
    await ctx2.clearCookies();
  }
  await ctx2.close();
  schritt("Open-Redirect-Versuche landen auf der Startseite");

  // --- 7. Abmelden ------------------------------------------------------------------------------
  await page.goto(`${base}/einstellungen`);
  await page.getByRole("button", { name: "Abmelden" }).click();
  await page.getByRole("heading", { name: "Anmelden", level: 1 }).waitFor();
  assert.deepEqual(
    (await context.cookies()).filter((c) => c.name === "fit_session"),
    [],
  );
  await page.goto(`${base}/verlauf`);
  await page.getByRole("heading", { name: "Anmelden", level: 1 }).waitFor();
  schritt("Abmelden entfernt das Cookie, danach wieder die Anmeldeseite");

  // --- 8. Ratenbremse: fünf Fehlversuche sperren, auch das richtige Passwort ------------------------
  await page.goto(`${base}/login`);
  // Ein Fehlversuch zählt schon aus Schritt 2: Spätestens der fünfte Versuch insgesamt sperrt.
  let gesperrt = false;
  for (let i = 0; i < 5 && !gesperrt; i++) {
    await page.getByLabel("Passwort").fill(`falsch-${i}`);
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      page.getByRole("button", { name: "Anmelden" }).click(),
    ]);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300); // Weiterleitung der Server Action abwarten
    const meldung = page.getByText(/Zu viele Fehlversuche|Das Passwort stimmt nicht\./);
    await meldung.waitFor();
    gesperrt = /Zu viele/.test(await meldung.innerText());
  }
  assert.ok(gesperrt, "spätestens nach fünf Fehlversuchen gesperrt");
  await shot("2-gesperrt");
  await anmelden(PASSWORT);
  await page.getByText(/Zu viele Fehlversuche/).waitFor();
  assert.deepEqual(
    (await context.cookies()).filter((c) => c.name === "fit_session"),
    [],
  );
  schritt("Nach fünf Fehlversuchen ist die Anmeldung gesperrt (auch mit richtigem Passwort)");

  assert.deepEqual(
    fehler.filter((f) => !/HTTP (401|403)/.test(f)),
    [],
    "Browser-Fehler",
  );
  await context.close();
}

console.log("Mobil (390×844), APP_PASSWORD gesetzt");
await withApp(({ browser, BASE: base }) => ablauf(browser, base), {
  env: { APP_PASSWORD: PASSWORT },
});
