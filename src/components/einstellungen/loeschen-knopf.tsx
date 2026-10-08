"use client";

import { useActionState } from "react";
import type { LoeschState } from "@/app/einstellungen/form-state";
import { FehlerBanner } from "@/components/form-felder";
import { knopfSekundaer } from "@/components/ui";
import { de } from "@/i18n/de";

export function LoeschenKnopf({ aktion }: { aktion: (prev: LoeschState) => Promise<LoeschState> }) {
  const [state, formAction, pending] = useActionState(aktion, {} as LoeschState);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(de.profil.loeschenFrage)) e.preventDefault();
      }}
    >
      {state.fehler && <FehlerBanner>{state.fehler}</FehlerBanner>}
      <button type="submit" disabled={pending} className={`${knopfSekundaer} text-bad-ink`}>
        {de.profil.loeschen}
      </button>
    </form>
  );
}
