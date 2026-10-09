import Link from "next/link";
import { SettingsForm } from "@/components/einstellungen/settings-form";
import {
  IconDatenbank,
  IconInfo,
  SymbolKachel,
} from "@/components/einstellungen/icons-einstellungen";
import { IconHantel, IconPfeilRechts } from "@/components/icons";
import { PageShell } from "@/components/page-shell";
import { gruppe, hilfstext, karte, kopfzeileKlein } from "@/components/ui";
import { db } from "@/db/client";
import { STUFEN } from "@/domain/anstrengung";
import { de } from "@/i18n/de";
import { InstallierenKarte } from "@/components/einstellungen/installieren-karte";
import { passwortAusUmgebung } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { speichereEinstellungen } from "./actions";

export const dynamic = "force-dynamic";

const t = de.einstellungen;

export default function EinstellungenPage() {
  const s = getSettings(db);

  return (
    <PageShell title={t.titel} breite="weit">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
        <div className="space-y-8">
          <section aria-labelledby="training" className="fade-up">
            <h2 id="training" className={kopfzeileKlein}>
              {t.training}
            </h2>
            <SettingsForm
              aktion={speichereEinstellungen}
              werte={{
                stufen: s.stufen,
                einheitenProWoche: s.einheitenProWoche,
                zusatzblock: s.zusatzblock,
                aufwaermenText: s.aufwaermenText,
              }}
            />
          </section>

          <section aria-labelledby="anstrengung" className="fade-up">
            <h2 id="anstrengung" className={kopfzeileKlein}>
              {de.training.anstrengungTitel}
            </h2>
            <div className={karte}>
              <p className="mb-3 text-[15px] text-ink-2">{de.training.anstrengungHilfe}</p>
              <ul className="space-y-1.5 text-[15px]">
                {STUFEN.map((st) => (
                  <li key={st.key}>
                    <span className="font-semibold">{st.text}:</span> {st.reserveSatz}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section aria-labelledby="equipment" className="fade-up">
            <h2 id="equipment" className={kopfzeileKlein}>
              {de.equipment.equipment}
            </h2>
            <ul className={gruppe}>
              <li>
                <Link
                  href="/plan"
                  className="press flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-fill"
                >
                  <SymbolKachel>
                    <IconHantel />
                  </SymbolKachel>
                  <span className="min-w-0 flex-1 text-[17px] font-semibold text-ink">
                    {t.zumPlan}
                  </span>
                  <IconPfeilRechts className="size-5 shrink-0 text-ink-3" />
                </Link>
              </li>
            </ul>
            <p className={`${hilfstext} px-1 pt-2`}>{t.equipmentHinweis}</p>
          </section>

          <section className="fade-up">
            <ul className={gruppe}>
              <li>
                <Link
                  href="/einstellungen/daten"
                  className="press flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-fill"
                >
                  <SymbolKachel ton="ok">
                    <IconDatenbank />
                  </SymbolKachel>
                  <span className="min-w-0 flex-1 text-[17px] font-semibold text-ink">
                    {de.daten.link}
                  </span>
                  <IconPfeilRechts className="size-5 shrink-0 text-ink-3" />
                </Link>
              </li>
            </ul>
          </section>

          <InstallierenKarte passwortSchutz={passwortAusUmgebung() !== ""} />

          <section aria-labelledby="hinweis" className={`${karte} fade-up`}>
            <div className="mb-3 flex items-center gap-3">
              <SymbolKachel ton="warn">
                <IconInfo />
              </SymbolKachel>
              <h2 id="hinweis" className="text-lg font-semibold tracking-tight text-ink">
                {t.hinweisTitel}
              </h2>
            </div>
            <p className="mb-3 text-[15px] leading-snug text-ink">{de.hinweis.text}</p>
            <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-snug text-ink-2">
              {de.hinweis.zusatz.map((z) => (
                <li key={z}>{z}</li>
              ))}
            </ul>
            {s.hinweisAkzeptiertAm && (
              <p className={`${hilfstext} mt-4`}>
                {t.bestaetigtAm(
                  new Date(s.hinweisAkzeptiertAm).toLocaleDateString("de-DE", {
                    timeZone: "Europe/Berlin",
                  }),
                )}
              </p>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  );
}
