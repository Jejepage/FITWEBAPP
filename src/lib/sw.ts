// Kleine Helfer für den Service Worker (nur im sicheren Kontext vorhanden, sonst wirkungslos).

/** Bittet den Service Worker, den Notfall-Cache der aktuellen Seite aufzufrischen. */
export function aktualisiereSeitenCache(pfad: string): void {
  try {
    navigator.serviceWorker?.controller?.postMessage({ typ: "aktualisiere", pfad });
  } catch {
    // ohne Service Worker nichts zu tun
  }
}

/** Löscht alle Caches dieser App (beim Abmelden). */
export async function leereCaches(): Promise<void> {
  try {
    if (typeof caches === "undefined") return;
    const namen = await caches.keys();
    await Promise.all(namen.map((n) => caches.delete(n)));
  } catch {
    // ohne Cache-API nichts zu tun
  }
}
