"use client";

import { useState } from "react";
import { FehlerBanner } from "@/components/form-felder";
import { SCHRITT, type FormularWerte } from "@/domain/satz-vorbelegung";
import { de } from "@/i18n/de";
import { Stepper } from "./stepper";
import type { UebungInfo } from "./typen";

const t = de.training;

/** Eingabe der Werte eines Satzes (Gewicht, Wdh/Sekunden/Meter, RPE, Tempo) mit großem Hauptknopf. */
export function SatzFormular({
  info,
  startWerte,
  korrektur,
  onErledigt,
  onKorrekturVerwerfen,
}: {
  info: UebungInfo;
  startWerte: FormularWerte;
  korrektur: boolean;
  onErledigt: (werte: FormularWerte) => void;
  onKorrekturVerwerfen: () => void;
}) {
  const [werte, setWerte] = useState<FormularWerte>(startWerte);
  const [fehler, setFehler] = useState<string | null>(null);
  const set = <K extends keyof FormularWerte>(k: K, v: FormularWerte[K]) =>
    setWerte((w) => ({ ...w, [k]: v }));

  const messwert =
    info.belastungsart === "wdh"
      ? werte.wdh
      : info.belastungsart === "zeit"
        ? werte.sekunden
        : werte.meter;
  const hatGewicht = info.vorschlag.schritt > 0;
  const kannTempo = info.belastungsart === "wdh" && info.steigerungsart.includes("tempo");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (messwert === null) {
          setFehler(
            info.belastungsart === "wdh"
              ? "Bitte die Wiederholungen angeben."
              : info.belastungsart === "zeit"
                ? "Bitte die Sekunden angeben."
                : "Bitte die Meter angeben.",
          );
          return;
        }
        setFehler(null);
        onErledigt(werte);
      }}
    >
      {korrektur && (
        <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p className="mb-2 font-medium">{t.korrekturHinweis}</p>
          <button
            type="button"
            onClick={onKorrekturVerwerfen}
            className="min-h-11 font-medium underline"
          >
            {t.korrekturAbbrechen}
          </button>
        </div>
      )}
      {fehler && <FehlerBanner>{fehler}</FehlerBanner>}

      {hatGewicht && (
        <Stepper
          label={t.gewicht}
          einheit="kg"
          wert={werte.gewicht}
          schritt={info.vorschlag.schritt}
          max={1000}
          dezimal
          leer={t.gewichtOhne}
          onChange={(v) => set("gewicht", v)}
        />
      )}

      {info.belastungsart === "wdh" && (
        <Stepper
          label={t.wdh}
          wert={werte.wdh}
          schritt={SCHRITT.wdh}
          max={500}
          fehler={fehler !== null && werte.wdh === null}
          onChange={(v) => set("wdh", v === null ? null : Math.round(v))}
        />
      )}
      {info.belastungsart === "zeit" && (
        <Stepper
          label={t.sekunden}
          einheit="s"
          wert={werte.sekunden}
          schritt={SCHRITT.sekunden}
          max={7200}
          fehler={fehler !== null && werte.sekunden === null}
          onChange={(v) => set("sekunden", v === null ? null : Math.round(v))}
        />
      )}
      {info.belastungsart === "strecke" && (
        <Stepper
          label={t.meter}
          einheit="m"
          wert={werte.meter}
          schritt={SCHRITT.meter}
          max={20000}
          dezimal
          fehler={fehler !== null && werte.meter === null}
          onChange={(v) => set("meter", v)}
        />
      )}

      <fieldset className="mb-4">
        <legend className="mb-1 text-sm font-medium">{t.rpe}</legend>
        <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={t.rpe}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
            const gewaehlt = werte.rpe === n;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={gewaehlt}
                onClick={() => set("rpe", n)}
                className={`flex h-12 items-center justify-center rounded-lg border text-lg font-semibold ${
                  gewaehlt
                    ? "border-brand bg-brand text-white"
                    : "border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-neutral-500">{t.rpeHilfe}</p>
      </fieldset>

      {kannTempo && (
        <label className="mb-4 flex min-h-12 items-center gap-3">
          <input
            type="checkbox"
            checked={werte.tempo}
            onChange={(e) => set("tempo", e.target.checked)}
            className="size-6"
          />
          <span>{t.tempo}</span>
        </label>
      )}

      <div className="sticky bottom-16 -mx-4 border-t border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950 md:static md:mx-0 md:border-0 md:px-0">
        <button
          type="submit"
          className="flex min-h-16 w-full items-center justify-center rounded-xl bg-brand text-xl font-semibold text-white active:opacity-90"
        >
          {korrektur ? t.korrekturSpeichern : t.satzErledigt}
        </button>
      </div>
    </form>
  );
}
