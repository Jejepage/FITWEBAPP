"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import type { EquipmentState } from "@/app/plan/equipment/form-state";
import { FehlerBanner } from "@/components/form-felder";
import { karte, knopfNeutral, knopfPrimaer } from "@/components/ui";
import type { EquipmentFormWerte } from "@/domain/equipment-form";
import { de } from "@/i18n/de";
import { EquipmentFelder } from "./equipment-felder";

const t = de.equipment;

/** Equipment und Hantelgewichte eines bestehenden Plans ändern. */
export function EquipmentForm({
  aktion,
  werte,
}: {
  aktion: (prev: EquipmentState, fd: FormData) => Promise<EquipmentState>;
  werte: EquipmentFormWerte;
}) {
  const [state, formAction, pending] = useActionState(aktion, {} as EquipmentState);
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
      {hatFehler && <FehlerBanner>{fehler._form ?? t.formularFehler}</FehlerBanner>}

      <div className={karte}>
        <EquipmentFelder
          equipment={w.equipment}
          gewichteText={w.gewichteText}
          fehler={fehler}
          texte={t}
        />
        <p className="text-[15px] text-ink-2">{t.wirkung}</p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={pending} className={`${knopfPrimaer} sm:min-w-40`}>
          {t.speichern}
        </button>
        <Link href="/plan" className={knopfNeutral}>
          {t.abbrechen}
        </Link>
      </div>
    </form>
  );
}
