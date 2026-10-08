"use client";

import { useEffect } from "react";

/**
 * Registriert den Service Worker, aber nur im sicheren Kontext (HTTPS oder localhost). Über
 * reines HTTP im Heimnetz bleibt die App eine normale Webseite; Fehler werden still ignoriert.
 */
export function SwRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!window.isSecureContext || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
