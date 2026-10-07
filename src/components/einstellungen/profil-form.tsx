"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import type { ProfilState } from "@/app/einstellungen/form-state";
import { Checkbox, FehlerBanner, Feld, Gruppe } from "@/components/form-felder";
import { eingabe, knopfPrimaer, knopfSekundaer } from "@/components/ui";
import { GEWICHT_ARTEN, type ProfilFormWerte } from "@/domain/profile-form";
import { EQUIPMENT_AUSWAHL, EQUIPMENT_NAMEN } from "@/domain/types";
import { de } from "@/i18n/de";

const t = de.profil;

export function ProfilForm({
  aktion,
  werte,
  istAktuellStandard,
}: {
  aktion: (prev: ProfilState, fd: FormData) => Promise<ProfilState>;
  werte: ProfilFormWerte;
  /** Das Standardprofil bleibt Standard (Haken fest). */
  istAktuellStandard: boolean;
}) {
  const [state, formAction, pending] = useActionState(aktion, {} as ProfilState);
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
      {hatFehler && <FehlerBanner>{fehler._form ?? de.einstellungen.formularFehler}</FehlerBanner>}

      <Feld label={t.name} fehler={fehler.name}>
        <input name="name" defaultValue={w.name} maxLength={80} className={eingabe} />
      </Feld>

      <Gruppe legende={t.equipment} hilfe={t.equipmentHilfe}>
        <div className="grid sm:grid-cols-2">
          {EQUIPMENT_AUSWAHL.map((art) => (
            <Checkbox
              key={art}
              name="equipment"
              value={art}
              label={EQUIPMENT_NAMEN[art]}
              checked={w.equipment.includes(art)}
            />
          ))}
        </div>
      </Gruppe>

      {GEWICHT_ARTEN.map((art) => (
        <Feld key={art} label={t.gewichte(EQUIPMENT_NAMEN[art])} fehler={fehler[`gewichte_${art}`]}>
          <input
            name={`gewichte_${art}`}
            defaultValue={w.gewichteText[art]}
            inputMode="text"
            placeholder={art === "kurzhanteln" ? "2–20/2" : "12, 16"}
            className={eingabe}
          />
        </Feld>
      ))}
      <p className="-mt-2 mb-4 text-sm text-neutral-500">{t.gewichteHilfe}</p>

      <Checkbox
        name="istStandard"
        label={t.istStandard}
        checked={istAktuellStandard || w.istStandard}
        disabled={istAktuellStandard}
      />
      {istAktuellStandard && <p className="mb-4 text-sm text-neutral-500">{t.istStandardFest}</p>}

      <div className="mt-6 flex gap-3">
        <button type="submit" disabled={pending} className={knopfPrimaer}>
          {t.speichern}
        </button>
        <Link href="/einstellungen" className={knopfSekundaer}>
          {t.abbrechen}
        </Link>
      </div>
    </form>
  );
}
