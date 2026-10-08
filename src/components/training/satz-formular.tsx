"use client";

import { useState } from "react";
import { FehlerBanner } from "@/components/form-felder";
import { STUFEN, stufeVonWert, type AnstrengungsStufe } from "@/domain/anstrengung";
import { SCHRITT, type FormularWerte } from "@/domain/satz-vorbelegung";
import { de } from "@/i18n/de";
import { knopfNeutral } from "@/components/ui";
import { Angeheftet, hauptKnopf } from "./bausteine";
import { IconZurueck } from "./icons-training";
import { Schalter } from "./schalter";
import { Stepper } from "./stepper";
import type { UebungInfo } from "./typen";

const t = de.training;

/** Vier Anstrengungsstufen von grün nach rot; Klassen ausgeschrieben, damit Tailwind sie findet. */
const STUFE_KLASSE: Record<AnstrengungsStufe, string> = {
  leicht: "bg-rpe-1 text-on-rpe",
  gut: "bg-rpe-5 text-on-rpe",
  schwer: "bg-rpe-8 text-on-rpe",
  limit: "bg-rpe-10 text-on-rpe-hi",
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
          className="clear-both grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4"
          role="radiogroup"
          aria-label={t.rpe}
        >
          {STUFEN.map((st) => {
            const gewaehlt = werte.rpe !== null && stufeVonWert(werte.rpe).key === st.key;
            return (
              <button
                key={st.key}
                type="button"
                role="radio"
                aria-checked={gewaehlt}
                aria-label={st.text}
                onClick={() => set("rpe", st.wert)}
                className={`press flex min-h-[4.5rem] flex-col items-center justify-center rounded-xl px-2 py-2 ${STUFE_KLASSE[st.key]} ${
                  gewaehlt
                    ? "z-10 scale-[1.03] shadow-lg ring-[3px] ring-ink ring-offset-2 ring-offset-surface"
                    : "hover:brightness-95"
                }`}
              >
                <span className="text-lg font-bold leading-tight">{st.text}</span>
                <span className="text-xs font-medium leading-tight">{st.reserveKurz}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-ink-2" aria-live="polite">
          {werte.rpe === null ? t.rpeFrage : stufeVonWert(werte.rpe).reserveSatz}
        </p>
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
