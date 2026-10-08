"use client";

import { useState } from "react";
import { FehlerBanner } from "@/components/form-felder";
import { SCHRITT, type FormularWerte } from "@/domain/satz-vorbelegung";
import { de } from "@/i18n/de";
import { knopfNeutral } from "@/components/ui";
import { Angeheftet, hauptKnopf } from "./bausteine";
import { IconZurueck } from "./icons-training";
import { Schalter } from "./schalter";
import { Stepper } from "./stepper";
import type { UebungInfo } from "./typen";

const t = de.training;

/** RPE 1–10 von grün nach rot; Klassen ausgeschrieben, damit Tailwind sie findet. */
const RPE_KLASSE: Record<number, string> = {
  1: "bg-rpe-1 text-on-rpe",
  2: "bg-rpe-2 text-on-rpe",
  3: "bg-rpe-3 text-on-rpe",
  4: "bg-rpe-4 text-on-rpe",
  5: "bg-rpe-5 text-on-rpe",
  6: "bg-rpe-6 text-on-rpe",
  7: "bg-rpe-7 text-on-rpe",
  8: "bg-rpe-8 text-on-rpe",
  9: "bg-rpe-9 text-on-rpe",
  10: "bg-rpe-10 text-on-rpe-hi",
};

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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-warn-soft p-4 text-warn-ink">
          <p className="font-medium">{t.korrekturHinweis}</p>
          <button type="button" onClick={onKorrekturVerwerfen} className={knopfNeutral}>
            <IconZurueck className="size-5" />
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

      <fieldset className="mb-3 rounded-card bg-surface p-4 shadow-card">
        <legend className="float-left mb-2 w-full text-sm font-medium text-ink-3">{t.rpe}</legend>
        <div
          className="clear-both grid grid-cols-5 gap-2 sm:grid-cols-10 lg:grid-cols-5 xl:grid-cols-10"
          role="radiogroup"
          aria-label={t.rpe}
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
            const gewaehlt = werte.rpe === n;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={gewaehlt}
                onClick={() => set("rpe", n)}
                className={`press flex h-14 items-center justify-center rounded-xl text-xl font-bold tabular-nums ${RPE_KLASSE[n]} ${
                  gewaehlt
                    ? "z-10 scale-110 shadow-lg ring-[3px] ring-ink ring-offset-2 ring-offset-surface"
                    : "hover:brightness-95"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-ink-3">{t.rpeHilfe}</p>
      </fieldset>

      {kannTempo && (
        <Schalter
          klasse="mb-3 rounded-card bg-surface shadow-card"
          checked={werte.tempo}
          onChange={(v) => set("tempo", v)}
        >
          {t.tempo}
        </Schalter>
      )}

      <Angeheftet>
        <button type="submit" className={hauptKnopf}>
          {korrektur ? t.korrekturSpeichern : t.satzErledigt}
        </button>
      </Angeheftet>
    </form>
  );
}
