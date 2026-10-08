"use client";

import { useActionState, useEffect, useState } from "react";
import type { SettingsState } from "@/app/einstellungen/form-state";
import {
  Checkbox,
  ErfolgBanner,
  FehlerBanner,
  Feld,
  Gruppe,
  Radio,
} from "@/components/form-felder";
import { eingabe, karte, knopfPrimaer } from "@/components/ui";
import type { SettingsFormWerte } from "@/domain/settings-form";
import { MUSTER, MUSTER_NAMEN } from "@/domain/types";
import { de } from "@/i18n/de";
import { MUSTER_FARBE } from "@/lib/muster-farbe";

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
  // "Gespeichert" gilt nur, bis wieder etwas geändert wird: Die Änderung wird an den Zustand
  // gebunden, auf den sie folgt; ein neuer Speicherzustand zeigt den Hinweis wieder an.
  const [geaendertNach, setGeaendertNach] = useState<SettingsState | null>(null);
  const geaendert = geaendertNach === state;

  useEffect(() => {
    if (hatFehler) document.querySelector("form [role=alert]")?.scrollIntoView({ block: "center" });
  }, [state, hatFehler]);

  return (
    <form
      key={state.werte ? JSON.stringify(state.werte) : "initial"}
      action={formAction}
      onChange={() => setGeaendertNach(state)}
      noValidate
    >
      {hatFehler && <FehlerBanner>{t.formularFehler}</FehlerBanner>}
      {state.gespeichert && !geaendert && <ErfolgBanner>{t.gespeichert}</ErfolgBanner>}

      <div className={karte}>
        <Gruppe legende={t.stufenTitel} hilfe={t.stufenHilfe} fehler={fehler.stufen}>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4 lg:grid-cols-2">
            {MUSTER.map((m) => (
              <Feld
                key={m}
                label={`${MUSTER_NAMEN[m]} (${m})`}
                punkt={MUSTER_FARBE[m].fl}
                fehler={fehler[`stufe_${m}`]}
                klasse="flex flex-col justify-end"
              >
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
          <div className="grid grid-cols-2">
            {[2, 3].map((n) => (
              <Radio
                key={n}
                name="einheitenProWoche"
                value={String(n)}
                label={t.einheitenOption(n)}
                checked={w.einheitenProWoche === n}
              />
            ))}
          </div>
        </Gruppe>

        <div className="mb-6">
          <Checkbox
            name="zusatzblock"
            label={t.zusatzblock}
            hilfe={t.zusatzblockHilfe}
            checked={w.zusatzblock}
          />
        </div>

        <Feld label={t.aufwaermen} hilfe={t.aufwaermenHilfe} fehler={fehler.aufwaermenText}>
          <textarea
            name="aufwaermenText"
            rows={6}
            defaultValue={w.aufwaermenText}
            className={eingabe}
          />
        </Feld>

        <button type="submit" disabled={pending} className={`${knopfPrimaer} w-full`}>
          {t.speichern}
        </button>
      </div>
    </form>
  );
}
