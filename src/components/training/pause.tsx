"use client";

import { useEffect, useRef } from "react";
import { knopfSekundaer } from "@/components/ui";
import { de } from "@/i18n/de";
import { useJetzt } from "./hooks";

const t = de.training.pause;

/** Countdown auf Zeitstempel-Basis: läuft auch bei gesperrtem Bildschirm korrekt weiter. */
export function Pause({
  bis,
  dauer,
  naechsteName,
  naechsteZiel,
  onEnde,
  onUeberspringen,
  onVerlaengern,
}: {
  /** Ende der Pause als Zeitstempel (ms) */
  bis: number;
  /** Ursprüngliche Dauer in Sekunden (für den Fortschrittsbalken) */
  dauer: number;
  naechsteName: string;
  naechsteZiel: string;
  onEnde: () => void;
  onUeberspringen: () => void;
  onVerlaengern: () => void;
}) {
  const jetzt = useJetzt(true);
  const rest = Math.max(0, Math.ceil((bis - jetzt) / 1000));
  const gemeldet = useRef(false);

  useEffect(() => {
    if (rest === 0 && !gemeldet.current) {
      gemeldet.current = true;
      onEnde();
    }
    if (rest > 0) gemeldet.current = false;
  }, [rest, onEnde]);

  const anteil = Math.min(100, Math.max(0, (rest / Math.max(dauer, rest, 1)) * 100));

  return (
    <section aria-labelledby="pause-titel" className="text-center">
      <h2
        id="pause-titel"
        className="mb-2 text-lg font-semibold text-neutral-600 dark:text-neutral-400"
      >
        {t.titel}
      </h2>
      <p className="text-7xl font-bold tabular-nums" role="timer" aria-live="off">
        {rest}
      </p>
      <p className="mb-4 text-sm text-neutral-500">
        {rest === 0 ? t.vorbei : t.sekundenKurz(rest)}
      </p>
      <div className="mx-auto mb-6 h-2 max-w-xs overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div className="h-full bg-brand" style={{ width: `${anteil}%` }} />
      </div>
      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 text-left dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm text-neutral-500">{t.naechste}</p>
        <p className="text-xl font-semibold">{naechsteName}</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{naechsteZiel}</p>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onVerlaengern} className={`${knopfSekundaer} flex-1`}>
          {t.plus15}
        </button>
        <button
          type="button"
          onClick={onUeberspringen}
          className="flex min-h-11 flex-[2] items-center justify-center rounded-lg bg-brand px-4 text-base font-semibold text-white"
        >
          {t.ueberspringen}
        </button>
      </div>
    </section>
  );
}
