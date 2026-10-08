"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect } from "react";

/**
 * Macht das GET-Filterformular "live": Auswahlen wirken sofort, Texteingaben nach kurzer Pause.
 * Es wird weich navigiert (Router), sodass Fokus und Cursor in den Feldern erhalten bleiben.
 * Ohne JavaScript bleibt das Formular ein normales GET-Formular (Enter oder Knopf "Filtern").
 */
export function FilterLive({ formId, ziel }: { formId: string; ziel: string }) {
  const router = useRouter();
  const suche = useSearchParams();
  // Adresse -> Felder: Nach "Zurücksetzen" oder einem Lesezeichen sollen die Felder der Adresse
  // folgen (React behält sonst den eingegebenen Wert). Das fokussierte Feld bleibt unberührt.
  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;
    for (const el of Array.from(form.elements)) {
      if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) continue;
      if (!el.name || el.type === "hidden" || el === document.activeElement) continue;
      const soll = suche.get(el.name) ?? "";
      if (el.value === soll) continue;
      // Unbekannte Werte (z. B. ?stufe=7) nicht setzen: sonst bliebe ein Auswahlfeld leer
      if (el instanceof HTMLSelectElement && !Array.from(el.options).some((o) => o.value === soll))
        el.value = "";
      else el.value = soll;
    }
  }, [formId, suche]);
  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;
    let timer: number | undefined;

    const senden = () => {
      const params = new URLSearchParams();
      new FormData(form).forEach((wert, name) => {
        if (typeof wert === "string" && wert !== "") params.append(name, wert);
      });
      const query = params.toString();
      startTransition(() => router.replace(query ? `${ziel}?${query}` : ziel, { scroll: false }));
    };
    const gehoertZumFormular = (
      el: EventTarget | null,
    ): el is HTMLInputElement | HTMLSelectElement =>
      (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) && el.form === form;

    const beiEingabe = (e: Event) => {
      if (!gehoertZumFormular(e.target)) return;
      if ((e as InputEvent).isComposing) return; // IME-Eingabe noch nicht abgeschlossen
      if (e.target instanceof HTMLInputElement && e.target.type === "search") {
        window.clearTimeout(timer);
        timer = window.setTimeout(senden, 350);
      }
    };
    const beiAenderung = (e: Event) => {
      if (!gehoertZumFormular(e.target)) return;
      if (e.target instanceof HTMLInputElement && e.target.type === "search") return; // läuft über input
      window.clearTimeout(timer);
      senden();
    };
    const beiAbsenden = (e: Event) => {
      // Enter in einem Suchfeld: ohne Neuladen absenden
      e.preventDefault();
      window.clearTimeout(timer);
      senden();
    };
    document.addEventListener("input", beiEingabe);
    document.addEventListener("change", beiAenderung);
    form.addEventListener("submit", beiAbsenden);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("input", beiEingabe);
      document.removeEventListener("change", beiAenderung);
      form.removeEventListener("submit", beiAbsenden);
    };
  }, [formId, ziel, router]);
  return null;
}
