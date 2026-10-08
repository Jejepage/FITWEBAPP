"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type WakeLockApi = { request(art: "screen"): Promise<{ release(): Promise<void> }> };
const wakeLockApi = (): WakeLockApi | undefined =>
  (navigator as Navigator & { wakeLock?: WakeLockApi }).wakeLock;

const keinAbo = () => () => {};

/**
 * Hält den Bildschirm an, solange `aktiv` gilt – wenn der Browser es anbietet (nur in sicheren
 * Kontexten, also nicht über HTTP im Heimnetz). Gibt zurück, ob die Funktion verfügbar ist.
 */
export function useWakeLock(aktiv: boolean): { verfuegbar: boolean } {
  const verfuegbar = useSyncExternalStore(
    keinAbo,
    () => wakeLockApi() !== undefined,
    () => true, // Serverrendering: keine Warnung anzeigen
  );

  useEffect(() => {
    const api = wakeLockApi();
    if (!aktiv || !api) return;
    let sperre: { release(): Promise<void> } | null = null;
    let beendet = false;
    const anfordern = async () => {
      try {
        const s = await api.request("screen");
        if (beendet) void s.release().catch(() => {});
        else sperre = s;
      } catch {
        /* z. B. Energiesparmodus: ohne Sperre weitermachen */
      }
    };
    void anfordern();
    // Beim Zurückkehren in die App muss die Sperre neu angefordert werden.
    const sichtbar = () => {
      if (document.visibilityState === "visible") void anfordern();
    };
    document.addEventListener("visibilitychange", sichtbar);
    return () => {
      beendet = true;
      document.removeEventListener("visibilitychange", sichtbar);
      void sperre?.release().catch(() => {});
    };
  }, [aktiv]);

  return { verfuegbar };
}

/** Aktuelle Zeit in ms, aktualisiert im Takt, solange `aktiv` gilt. */
export function useJetzt(aktiv: boolean, takt = 250): number {
  const [jetzt, setJetzt] = useState(() => Date.now());
  useEffect(() => {
    if (!aktiv) return;
    const id = window.setInterval(() => setJetzt(Date.now()), takt);
    return () => window.clearInterval(id);
  }, [aktiv, takt]);
  return jetzt;
}

/** Ist der Bildschirm breit genug für die Seitenleiste (ab 1024 px, wie Tailwind `lg`)? */
export function useGrosserBildschirm(): boolean {
  return useSyncExternalStore(
    (melde) => {
      const mq = window.matchMedia("(min-width: 1024px)");
      mq.addEventListener("change", melde);
      return () => mq.removeEventListener("change", melde);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );
}
