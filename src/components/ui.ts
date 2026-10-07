// Gemeinsame Tailwind-Klassen. Mindesthöhe 44 px für Tippflächen, 16 px Schrift gegen iOS-Zoom.
export const eingabe =
  "block w-full min-h-11 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 focus:border-brand focus:outline-2 focus:outline-brand dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

const knopf =
  "inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-base font-medium";
export const knopfPrimaer = `${knopf} bg-brand text-white hover:opacity-90`;
export const knopfSekundaer = `${knopf} border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800`;

export const karte =
  "rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900";
