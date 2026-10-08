import { karte } from "@/components/ui";
import { de } from "@/i18n/de";
import { AbmeldenKnopf } from "./abmelden-knopf";

const t = de.installieren;

/** App auf den Home-Bildschirm bringen (Anleitung) und, bei aktivem Passwortschutz, Abmelden. */
export function InstallierenKarte({ passwortSchutz }: { passwortSchutz: boolean }) {
  return (
    <>
      <section className={`${karte} mb-10`} aria-labelledby="installieren-titel">
        <h2 id="installieren-titel" className="mb-2 text-lg font-semibold">
          {t.titel}
        </h2>
        <ul className="mb-3 list-disc space-y-1 pl-5 text-sm">
          <li>{t.iphone}</li>
          <li>{t.android}</li>
        </ul>
        <p className="text-sm text-ink-2">{t.hinweisHttp}</p>
      </section>
      {passwortSchutz && (
        <section className={`${karte} mb-10`} aria-labelledby="abmelden-titel">
          <h2 id="abmelden-titel" className="mb-1 text-lg font-semibold">
            {de.login.abmelden}
          </h2>
          <p className="mb-3 text-sm text-ink-2">{de.login.abmeldenHilfe}</p>
          <AbmeldenKnopf />
        </section>
      )}
    </>
  );
}
