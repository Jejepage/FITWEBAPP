"use client";

import { useState } from "react";
import { formatZahl } from "@/domain/satz-format";
import { de } from "@/i18n/de";

const t = de.training;

const runde = (n: number) => Math.round(n * 100) / 100;

function lies(text: string): number | null {
  const s = text.trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Zahleneingabe mit großen Plus/Minus-Knöpfen für das Handy. */
export function Stepper({
  label,
  einheit,
  wert,
  schritt,
  min = 0,
  max,
  dezimal = false,
  leer,
  onChange,
  fehler,
}: {
  label: string;
  einheit?: string;
  wert: number | null;
  schritt: number;
  min?: number;
  max: number;
  dezimal?: boolean;
  /** Text im leeren Zustand (z. B. "ohne" beim Gewicht) */
  leer?: string;
  onChange: (wert: number | null) => void;
  fehler?: boolean;
}) {
  const [text, setText] = useState(wert === null ? "" : formatZahl(wert));

  const setze = (n: number | null) => {
    setText(n === null ? "" : formatZahl(n));
    onChange(n);
  };
  const aendere = (richtung: 1 | -1) => {
    const aktuell = lies(text);
    if (aktuell === null && richtung < 0) return;
    const neu = runde(Math.min(max, Math.max(min, (aktuell ?? 0) + richtung * schritt)));
    setze(neu);
  };

  const knopf =
    "flex size-12 shrink-0 items-center justify-center rounded-lg border border-neutral-300 bg-white text-2xl font-medium active:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:active:bg-neutral-800";

  return (
    <div className="mb-4">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={knopf}
          onClick={() => aendere(-1)}
          aria-label={`${label}: ${t.verringern}`}
        >
          −
        </button>
        <div className="relative flex-1">
          <input
            type="text"
            inputMode={dezimal ? "decimal" : "numeric"}
            aria-label={label}
            aria-invalid={fehler || undefined}
            value={text}
            placeholder={leer}
            onChange={(e) => {
              setText(e.target.value);
              onChange(lies(e.target.value));
            }}
            className={`h-12 w-full rounded-lg border bg-white px-3 text-center text-2xl font-semibold dark:bg-neutral-900 ${
              fehler ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
            }`}
          />
          {einheit && (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-neutral-500">
              {einheit}
            </span>
          )}
        </div>
        <button
          type="button"
          className={knopf}
          onClick={() => aendere(1)}
          aria-label={`${label}: ${t.erhoehen}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
