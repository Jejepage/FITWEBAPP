import Link from "next/link";
import { Badge } from "@/components/katalog/badge";
import { SettingsForm } from "@/components/einstellungen/settings-form";
import {
  IconDatenbank,
  IconInfo,
  SymbolKachel,
} from "@/components/einstellungen/icons-einstellungen";
import { IconHantel, IconPfeilRechts, IconPlus } from "@/components/icons";
import { PageShell } from "@/components/page-shell";
import { gruppe, hilfstext, karte, kopfzeileKlein } from "@/components/ui";
import { db } from "@/db/client";
import { STUFEN } from "@/domain/anstrengung";
import { zaehleMachbar } from "@/domain/equipment";
import { formatGewichte } from "@/domain/gewichte";
import { MUSTER, EQUIPMENT_NAMEN } from "@/domain/types";
import { de } from "@/i18n/de";
import { InstallierenKarte } from "@/components/einstellungen/installieren-karte";
import { alleUebungen } from "@/server/exercises";
import { passwortAusUmgebung } from "@/server/auth";
import { listProfiles } from "@/server/profiles";
import { getSettings } from "@/server/settings";
import { speichereEinstellungen } from "./actions";

export const dynamic = "force-dynamic";

const t = de.einstellungen;

export default function EinstellungenPage() {
  const s = getSettings(db);
  const profile = listProfiles(db);
  const uebungen = alleUebungen(db);
  const aktive = uebungen.filter((u) => u.aktiv).length;

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
          <section aria-labelledby="profile" className="fade-up">
            <h2 id="profile" className={kopfzeileKlein}>
              {t.profile}
            </h2>
            <ul className={gruppe}>
              {profile.map((p) => {
                const anzahl = zaehleMachbar(uebungen, p.equipment);
                const gesamt = MUSTER.reduce((summe, m) => summe + anzahl[m], 0);
                const anteil = aktive > 0 ? Math.min(100, Math.round((gesamt / aktive) * 100)) : 0;
                const gewichte = (["kurzhanteln", "kettlebell"] as const)
                  .filter((art) => (p.gewichte[art]?.length ?? 0) > 0)
                  .map((art) =>
                    t.gewichteKurz(EQUIPMENT_NAMEN[art], formatGewichte(p.gewichte[art]!)),
                  );
                return (
                  <li key={p.id}>
                    <Link
                      href={`/einstellungen/profile/${p.id}`}
                      className="press flex min-h-16 items-center gap-3 px-4 py-3.5 hover:bg-fill"
                    >
                      <SymbolKachel>
                        <IconHantel />
                      </SymbolKachel>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-[17px] font-semibold text-ink">{p.name}</span>
                          {p.istStandard && <Badge farbe="gut">{t.standard}</Badge>}
                        </span>
                        <span className="mt-0.5 block text-sm text-ink-2">
                          {p.equipment.length > 0
                            ? p.equipment.map((a) => EQUIPMENT_NAMEN[a]).join(", ")
                            : t.keinEquipment}
                        </span>
                        {gewichte.length > 0 && (
                          <span className="block text-sm text-ink-2">{gewichte.join(" · ")}</span>
                        )}
                        <span className="mt-1.5 block text-sm text-ink-3">
                          {t.machbarVonGesamt(gesamt, aktive)}
                        </span>
                        <span
                          aria-hidden="true"
                          className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-fill-2"
                        >
                          <span
                            className="block h-full rounded-full bg-accent"
                            style={{ width: `${anteil}%` }}
                          />
                        </span>
                      </span>
                      <IconPfeilRechts className="size-5 shrink-0 text-ink-3" />
                    </Link>
                  </li>
                );
              })}
              <li>
                <Link
                  href="/einstellungen/profile/neu"
                  className="press flex min-h-14 items-center gap-3 px-4 py-3 font-semibold text-accent-ink hover:bg-fill"
                >
                  <IconPlus className="size-5" />
                  {t.neuesProfil}
                </Link>
              </li>
            </ul>
            <p className={`${hilfstext} px-1 pt-2`}>{t.profileHilfe}</p>
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
