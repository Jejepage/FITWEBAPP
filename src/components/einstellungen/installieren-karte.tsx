import {
  IconInstallieren,
  IconSchloss,
  SymbolKachel,
} from "@/components/einstellungen/icons-einstellungen";
import { hilfstext, karte } from "@/components/ui";
import { de } from "@/i18n/de";
import { AbmeldenKnopf } from "./abmelden-knopf";

const t = de.installieren;

/** App auf den Home-Bildschirm bringen (Anleitung) und, bei aktivem Passwortschutz, Abmelden. */
export function InstallierenKarte({ passwortSchutz }: { passwortSchutz: boolean }) {
  return (
    <>
      <section className={karte} aria-labelledby="installieren-titel">
        <div className="mb-4 flex items-center gap-3">
          <SymbolKachel ton="verlauf">
            <IconInstallieren />
          </SymbolKachel>
          <h2 id="installieren-titel" className="text-lg font-semibold tracking-tight text-ink">
            {t.titel}
          </h2>
        </div>
        <ul className="mb-4 space-y-2">
          <li className="rounded-xl bg-fill px-4 py-3 text-[15px] leading-snug text-ink">
            {t.iphone}
          </li>
          <li className="rounded-xl bg-fill px-4 py-3 text-[15px] leading-snug text-ink">
            {t.android}
          </li>
        </ul>
        <p className={`${hilfstext} px-1`}>{t.hinweisHttp}</p>
      </section>
      {passwortSchutz && (
        <section className={karte} aria-labelledby="abmelden-titel">
          <div className="mb-4 flex items-center gap-3">
            <SymbolKachel ton="grau">
              <IconSchloss />
            </SymbolKachel>
            <div className="min-w-0">
              <h2 id="abmelden-titel" className="text-lg font-semibold tracking-tight text-ink">
                {de.login.abmelden}
              </h2>
              <p className={hilfstext}>{de.login.abmeldenHilfe}</p>
            </div>
          </div>
          <AbmeldenKnopf />
        </section>
      )}
    </>
  );
}
