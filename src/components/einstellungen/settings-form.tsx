"use client";

import { useActionState, useEffect } from "react";
import type { SettingsState } from "@/app/einstellungen/form-state";
import { Checkbox, ErfolgBanner, FehlerBanner, Feld, Gruppe } from "@/components/form-felder";
import { eingabe, knopfPrimaer } from "@/components/ui";
import type { SettingsFormWerte } from "@/domain/settings-form";
import { MUSTER, MUSTER_NAMEN } from "@/domain/types";
import { de } from "@/i18n/de";

const t = de.einstellungen;

export function SettingsForm({
  aktion,
  werte,
}: {
  aktion: (prev: SettingsState, fd: FormData) => Promise<SettingsState>;
  werte: SettingsFormWerte;
}) {
  const [state, formAction, pending] = useActionState(aktion, {} as SettingsState);
  const w = state.werte ?? werte;
  const fehler = state.fehler ?? {};
  const hatFehler = Object.keys(fehler).length > 0;

  useEffect(() => {
    if (hatFehler) document.querySelector("form [role=alert]")?.scrollIntoView({ block: "center" });
  }, [state, hatFehler]);

  return (
    <form
      key={state.werte ? JSON.stringify(state.werte) : "initial"}
      action={formAction}
      noValidate
    >
      {hatFehler && <FehlerBanner>{t.formularFehler}</FehlerBanner>}
      {state.gespeichert && <ErfolgBanner>{t.gespeichert}</ErfolgBanner>}

      <Gruppe legende={t.stufenTitel} hilfe={t.stufenHilfe} fehler={fehler.stufen}>
        <div className="grid grid-cols-2 gap-x-3">
          {MUSTER.map((m) => (
            <Feld key={m} label={`${MUSTER_NAMEN[m]} (${m})`} fehler={fehler[`stufe_${m}`]}>
              <select name={`stufe_${m}`} defaultValue={String(w.stufen[m])} className={eingabe}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Feld>
          ))}
        </div>
      </Gruppe>

      <Gruppe legende={t.einheiten} fehler={fehler.einheitenProWoche}>
        {[2, 3].map((n) => (
          <label key={n} className="flex min-h-11 items-center gap-3">
            <input
              type="radio"
              name="einheitenProWoche"
              value={n}
              defaultChecked={w.einheitenProWoche === n}
              className="size-5"
            />
            <span>{t.einheitenOption(n)}</span>
          </label>
        ))}
      </Gruppe>

      <Checkbox name="zusatzblock" label={t.zusatzblock} checked={w.zusatzblock} />
      <p className="mb-4 text-sm text-neutral-500">{t.zusatzblockHilfe}</p>

      <Feld label={t.aufwaermen} hilfe={t.aufwaermenHilfe} fehler={fehler.aufwaermenText}>
        <textarea
          name="aufwaermenText"
          rows={6}
          defaultValue={w.aufwaermenText}
          className={eingabe}
        />
      </Feld>

      <button type="submit" disabled={pending} className={knopfPrimaer}>
        {t.speichern}
      </button>
    </form>
  );
}
