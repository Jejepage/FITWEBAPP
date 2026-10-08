"use client";

import { useState } from "react";
import { IconMinus, IconPlus } from "@/components/icons";
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

const rundKnopf =
  "press grid size-14 shrink-0 select-none place-items-center rounded-full text-ink hover:brightness-95";

/** Zahleneingabe mit großen runden Plus/Minus-Knöpfen für das Handy. */
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

  return (
    <div
      className={`mb-3 rounded-card bg-surface p-4 shadow-card transition-shadow ${
        fehler ? "ring-2 ring-bad" : ""
      }`}
    >
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-ink-3">{label}</span>
        {einheit && <span className="text-sm font-medium text-ink-3">{einheit}</span>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={`${rundKnopf} bg-fill-2`}
          onClick={() => aendere(-1)}
          aria-label={`${label}: ${t.verringern}`}
        >
          <IconMinus className="size-7" />
        </button>
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
          className="h-14 min-w-0 flex-1 rounded-xl bg-transparent text-center text-4xl font-bold tabular-nums tracking-tight text-ink placeholder:text-2xl placeholder:font-medium placeholder:text-ink-3 focus:bg-fill"
        />
        <button
          type="button"
          className={`${rundKnopf} bg-accent-soft text-accent-ink`}
          onClick={() => aendere(1)}
          aria-label={`${label}: ${t.erhoehen}`}
        >
          <IconPlus className="size-7" />
        </button>
      </div>
    </div>
  );
}
