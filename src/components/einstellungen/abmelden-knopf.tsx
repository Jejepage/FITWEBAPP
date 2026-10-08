"use client";

import { useRef } from "react";
import { abmelden } from "@/app/login/actions";
import { knopfSekundaer } from "@/components/ui";
import { de } from "@/i18n/de";
import { leereCaches } from "@/lib/sw";

/** Beendet die Sitzung und leert vorher die Notfall-Caches des Service Workers. */
export function AbmeldenKnopf() {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={abmelden}>
      <button
        type="button"
        className={`${knopfSekundaer} w-full`}
        onClick={async () => {
          await leereCaches();
          form.current?.requestSubmit();
        }}
      >
        {de.login.abmelden}
      </button>
    </form>
  );
}
