"use client";

import { useRef } from "react";
import { abmelden } from "@/app/login/actions";
import { IconAbmelden } from "@/components/einstellungen/icons-einstellungen";
import { knopfNeutral } from "@/components/ui";
import { de } from "@/i18n/de";
import { leereCaches } from "@/lib/sw";

/** Beendet die Sitzung und leert vorher die Notfall-Caches des Service Workers. */
export function AbmeldenKnopf() {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={abmelden}>
      <button
        type="button"
        className={`${knopfNeutral} w-full`}
        onClick={async () => {
          await leereCaches();
          form.current?.requestSubmit();
        }}
      >
        <IconAbmelden className="size-5" />
        {de.login.abmelden}
      </button>
    </form>
  );
}
