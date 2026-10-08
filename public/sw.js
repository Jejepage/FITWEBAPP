// Service Worker (nur mit HTTPS bzw. localhost aktiv, siehe sw-registrar.tsx). Er ist ein
// Notfallfallback für die laufende Einheit, keine Offline-App:
//  - /_next/static/* (Dateiname enthält einen Hash): Cache zuerst
//  - Seitenaufrufe: Netz zuerst; Trainingsseiten und die Startseite landen im Cache und kommen
//    bei fehlendem Netz von dort, sonst die Offline-Seite
//  - alles andere (API, Server Actions = POST, fremde Herkunft) wird nicht angefasst
const VERSION = "fit-v1";
const STATISCH = `${VERSION}-static`;
const SEITEN = `${VERSION}-seiten`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SEITEN)
      .then((c) => c.add("/offline"))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((namen) =>
        Promise.all(namen.filter((n) => !n.startsWith(VERSION)).map((n) => caches.delete(n))),
      )
      .then(() => self.clients.claim()),
  );
});

const cachebareSeite = (pfad) => pfad === "/" || pfad.startsWith("/training/");

async function seiteLaden(request) {
  try {
    const antwort = await fetch(request);
    // Weitergeleitete Antworten (z. B. auf die Anmeldeseite) und Fehler nie als Seite merken.
    if (antwort.ok && !antwort.redirected && cachebareSeite(new URL(request.url).pathname)) {
      const cache = await caches.open(SEITEN);
      await cache.put(request, antwort.clone());
    }
    return antwort;
  } catch {
    const cache = await caches.open(SEITEN);
    return (await cache.match(request)) || (await cache.match("/offline")) || Response.error();
  }
}

async function statischLaden(request) {
  const cache = await caches.open(STATISCH);
  const treffer = await cache.match(request);
  if (treffer) return treffer;
  const antwort = await fetch(request);
  if (antwort.ok) await cache.put(request, antwort.clone());
  return antwort;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(statischLaden(request));
  } else if (request.mode === "navigate") {
    event.respondWith(seiteLaden(request));
  }
});

self.addEventListener("message", (event) => {
  const daten = event.data || {};
  if (daten.typ === "leeren") {
    // Beim Abmelden: nichts von der Sitzung auf dem Gerät zurücklassen
    event.waitUntil(caches.keys().then((namen) => Promise.all(namen.map((n) => caches.delete(n)))));
  } else if (daten.typ === "aktualisiere" && typeof daten.pfad === "string") {
    // Nach jedem gespeicherten Satz: den Stand der Trainingsseite für den Notfall auffrischen
    const pfad = daten.pfad;
    if (!cachebareSeite(pfad)) return;
    event.waitUntil(
      fetch(pfad, { credentials: "same-origin" })
        .then(async (antwort) => {
          if (antwort.ok && !antwort.redirected) {
            const cache = await caches.open(SEITEN);
            await cache.put(new Request(new URL(pfad, self.location.origin).href), antwort);
          }
        })
        .catch(() => {}),
    );
  }
});
