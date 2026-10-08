import Link from "next/link";
import { IconPfeilLinks } from "@/components/icons";
import { Badge } from "@/components/katalog/badge";
import { FehlerBanner } from "@/components/form-felder";
import { PageShell } from "@/components/page-shell";
import { Angeheftet, hauptKnopf } from "@/components/training/bausteine";
import { Schalter } from "@/components/training/schalter";
import { bannerInfo, eingabe, gruppe, karte, knopfSekundaer, knopfText } from "@/components/ui";
import { db } from "@/db/client";
import { MUSTER, MUSTER_NAMEN, type Block } from "@/domain/types";
import { de } from "@/i18n/de";
import { MUSTER_FARBE } from "@/lib/muster-farbe";
import { ladeAdHocVorschau } from "@/server/ad-hoc-vorschau";
import type { SearchParams } from "@/server/katalog-filter";
import { listProfiles } from "@/server/profiles";
import { ladeStartInfo } from "@/server/start-info";
import { startTraining } from "../actions";

export const dynamic = "force-dynamic";

const t = de.adhoc;
const BLOCK_NAME: Record<Block, string> = {
  "1": de.training.block1,
  "2": de.training.block2,
  Z: de.training.blockZ,
};

const einzel = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function AdHocStartPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const info = ladeStartInfo(db);
  const zurueck = (
    <Link href="/" className={knopfText}>
      <IconPfeilLinks className="size-5" />
      {t.zurueck}
    </Link>
  );
  if (info.art !== "faellig") {
    return (
      <PageShell title={t.titel} breite="schmal" aktionen={zurueck}>
        <p className={karte}>
          {info.art === "laufend"
            ? de.start.laufendHilfe(info.einheit, info.woche)
            : info.art === "block_fertig"
              ? t.fehler.block_fertig
              : t.fehler.kein_plan}
        </p>
      </PageShell>
    );
  }

  const profile = listProfiles(db);
  const gewaehlt = Number(einzel(sp.profil));
  const profil =
    profile.find((p) => p.id === gewaehlt) ?? profile.find((p) => p.istStandard) ?? profile[0];
  const zusatzblock =
    einzel(sp.gesendet) === "1" ? einzel(sp.zusatzblock) === "on" : info.zusatzblockStandard;
  const vorschau = profil ? ladeAdHocVorschau(db, profil.id, zusatzblock) : null;

  const fehlerCode = einzel(sp.fehler);
  const fehlerMuster = (einzel(sp.muster) ?? "")
    .split(",")
    .filter((m): m is (typeof MUSTER)[number] => (MUSTER as readonly string[]).includes(m))
    .map((m) => MUSTER_NAMEN[m])
    .join(", ");
  const fehlerText =
    fehlerCode === "profil_unbekannt"
      ? t.fehler.profil_unbekannt
      : fehlerCode === "profil_unmoeglich"
        ? t.fehler.profil_unmoeglich(fehlerMuster)
        : null;

  return (
    <PageShell title={t.titel} breite="weit" aktionen={zurueck}>
      {fehlerText && <FehlerBanner>{fehlerText}</FehlerBanner>}

      <div className="lg:grid lg:grid-cols-5 lg:items-start lg:gap-8">
        <div className="mb-6 lg:col-span-2 lg:mb-0">
          <div className={`${bannerInfo} mb-4 space-y-2 text-[15px]`}>
            <p>{t.hilfe}</p>
            <p>{t.zaehlt}</p>
          </div>

          <form method="get" className="space-y-3">
            <input type="hidden" name="gesendet" value="1" />
            <label className="block rounded-card bg-surface p-4 shadow-card">
              <span className="mb-2 block text-sm font-medium text-ink-3">{t.profil}</span>
              <select name="profil" defaultValue={profil?.id} className={eingabe}>
                {profile.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <Schalter
              name="zusatzblock"
              defaultChecked={zusatzblock}
              klasse="rounded-card bg-surface shadow-card"
            >
              {t.zusatzblock}
            </Schalter>
            <button type="submit" className={`${knopfSekundaer} w-full`}>
              {t.vorschauAktualisieren}
            </button>
          </form>
        </div>

        <div className="lg:col-span-3">
          {vorschau?.art === "ok" && (
            <section aria-labelledby="vorschau-titel">
              <h2 id="vorschau-titel" className="mb-3 text-xl font-semibold tracking-tight">
                {t.vorschau}: {de.start.einheitWoche(vorschau.einheit, vorschau.woche, 6)} ·{" "}
                {vorschau.profilName}
              </h2>
              {vorschau.istPlanProfil && (
                <p className={`${bannerInfo} mb-3 text-[15px]`}>{t.planProfilHinweis}</p>
              )}
              {vorschau.fehlendeMuster.length > 0 && (
                <FehlerBanner>
                  {t.fehler.profil_unmoeglich(
                    vorschau.fehlendeMuster.map((m) => MUSTER_NAMEN[m]).join(", "),
                  )}
                </FehlerBanner>
              )}
              <ul className={`${gruppe} mb-4`}>
                {vorschau.zeilen.map((z) => {
                  const f = MUSTER_FARBE[z.muster];
                  return (
                    <li key={z.slotId} className="flex items-center gap-4 px-4 py-3.5">
                      <span
                        aria-hidden="true"
                        className={`grid size-10 shrink-0 place-items-center rounded-full ${f.soft}`}
                      >
                        <span className={`size-3.5 rounded-full ${f.fl}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-ink-3">
                          {BLOCK_NAME[z.block]} · {MUSTER_NAMEN[z.muster]}
                        </p>
                        {z.ersetzt ? (
                          <>
                            <p className="mt-0.5 text-sm text-ink-3 line-through">
                              {t.planUebung}: {z.geplantName}
                            </p>
                            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                              <Badge farbe="hinweis">{t.ersetztDurch}</Badge>
                              <span>{z.heuteName}</span>
                            </p>
                          </>
                        ) : (
                          <p className="mt-0.5 font-semibold">
                            {z.heuteName}{" "}
                            <span className="text-sm font-normal text-ink-3">({t.bleibt})</span>
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {vorschau.fehlendeMuster.length === 0 && (
                <form action={startTraining}>
                  <input
                    type="hidden"
                    name="profil"
                    value={vorschau.istPlanProfil ? "" : profil?.id}
                  />
                  {zusatzblock && <input type="hidden" name="zusatzblock" value="on" />}
                  <Angeheftet>
                    <button type="submit" className={hauptKnopf}>
                      {t.starten}
                    </button>
                  </Angeheftet>
                </form>
              )}
            </section>
          )}
        </div>
      </div>
    </PageShell>
  );
}
