import Link from "next/link";
import { Badge } from "@/components/katalog/badge";
import { FehlerBanner } from "@/components/form-felder";
import { eingabe, karte, knopfPrimaer, knopfSekundaer } from "@/components/ui";
import { db } from "@/db/client";
import { MUSTER, MUSTER_NAMEN, type Block } from "@/domain/types";
import { de } from "@/i18n/de";
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
  if (info.art !== "faellig") {
    return (
      <>
        <h1 className="mb-4 text-2xl font-bold">{t.titel}</h1>
        <p className={karte}>
          {info.art === "laufend"
            ? de.start.laufendHilfe(info.einheit, info.woche)
            : info.art === "block_fertig"
              ? t.fehler.block_fertig
              : t.fehler.kein_plan}
        </p>
        <Link href="/" className={`${knopfSekundaer} mt-4`}>
          {t.zurueck}
        </Link>
      </>
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
    <>
      <Link href="/" className="mb-3 inline-block min-h-11 py-2 text-accent-ink">
        ← {t.zurueck}
      </Link>
      <h1 className="mb-2 text-2xl font-bold">{t.titel}</h1>
      <p className="mb-1 text-sm text-ink-2">{t.hilfe}</p>
      <p className="mb-4 text-sm text-ink-2">{t.zaehlt}</p>
      {fehlerText && <FehlerBanner>{fehlerText}</FehlerBanner>}

      <form method="get" className={`${karte} mb-4`}>
        <input type="hidden" name="gesendet" value="1" />
        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium">{t.profil}</span>
          <select name="profil" defaultValue={profil?.id} className={eingabe}>
            {profile.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="mb-3 flex min-h-12 items-center gap-3">
          <input
            type="checkbox"
            name="zusatzblock"
            defaultChecked={zusatzblock}
            className="size-6"
          />
          <span>{t.zusatzblock}</span>
        </label>
        <button type="submit" className={`${knopfSekundaer} w-full`}>
          {t.vorschauAktualisieren}
        </button>
      </form>

      {vorschau?.art === "ok" && (
        <section aria-labelledby="vorschau-titel">
          <h2 id="vorschau-titel" className="mb-2 text-lg font-semibold">
            {t.vorschau}: {de.start.einheitWoche(vorschau.einheit, vorschau.woche, 6)} ·{" "}
            {vorschau.profilName}
          </h2>
          {vorschau.istPlanProfil && (
            <p className="mb-2 text-sm text-ink-2">{t.planProfilHinweis}</p>
          )}
          {vorschau.fehlendeMuster.length > 0 && (
            <FehlerBanner>
              {t.fehler.profil_unmoeglich(
                vorschau.fehlendeMuster.map((m) => MUSTER_NAMEN[m]).join(", "),
              )}
            </FehlerBanner>
          )}
          <ul className="mb-4 space-y-2">
            {vorschau.zeilen.map((z) => (
              <li key={z.slotId} className={karte}>
                <p className="text-xs text-ink-3">
                  {BLOCK_NAME[z.block]} · {MUSTER_NAMEN[z.muster]}
                </p>
                {z.ersetzt ? (
                  <>
                    <p className="text-sm text-ink-3 line-through">
                      {t.planUebung}: {z.geplantName}
                    </p>
                    <p className="font-medium">
                      {z.heuteName} <Badge farbe="hinweis">{t.ersetztDurch}</Badge>
                    </p>
                  </>
                ) : (
                  <p className="font-medium">
                    {z.heuteName}{" "}
                    <span className="text-sm font-normal text-ink-3">({t.bleibt})</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
          {vorschau.fehlendeMuster.length === 0 && (
            <form action={startTraining}>
              <input type="hidden" name="profil" value={vorschau.istPlanProfil ? "" : profil?.id} />
              {zusatzblock && <input type="hidden" name="zusatzblock" value="on" />}
              <button type="submit" className={`${knopfPrimaer} w-full min-h-14 text-lg`}>
                {t.starten}
              </button>
            </form>
          )}
        </section>
      )}
    </>
  );
}
