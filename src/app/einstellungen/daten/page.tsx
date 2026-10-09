import Link from "next/link";
import { BackupFormulare } from "@/components/einstellungen/backup-formulare";
import { IconKreisHaken, IconWarnung } from "@/components/einstellungen/icons-einstellungen";
import { IconPfeilLinks } from "@/components/icons";
import { BREITE, PageShell } from "@/components/page-shell";
import { bannerFehler, bannerOk, knopfText } from "@/components/ui";
import { de } from "@/i18n/de";
import type { SearchParams } from "@/server/katalog-filter";

export const dynamic = "force-dynamic";

const t = de.daten;
const BILANZ = ["uebungen", "neu", "plaene", "einheiten", "saetze"] as const;

export default async function DatenPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const fehler = (Array.isArray(sp.fehler) ? sp.fehler : sp.fehler ? [sp.fehler] : []).slice(0, 11);
  const bilanz = BILANZ.flatMap((k) => {
    const v = sp[k];
    return typeof v === "string" && /^\d{1,7}$/.test(v) ? [{ k, v }] : [];
  });

  return (
    <>
      <div className={`mx-auto w-full ${BREITE.normal}`}>
        <Link href="/einstellungen" className={`${knopfText} -ml-2 mb-1`}>
          <IconPfeilLinks className="size-5" />
          {t.zurueck}
        </Link>
      </div>
      <PageShell
        title={t.titel}
        untertitel={<span className="block max-w-2xl">{t.hilfe}</span>}
        breite="normal"
      >
        {sp.ergebnis === "ok" && (
          <section role="status" className={`${bannerOk} fade-up mb-8 flex items-start gap-3`}>
            <IconKreisHaken className="mt-0.5 size-6 shrink-0 text-ok-ink" />
            <div className="min-w-0">
              <p className="text-lg font-semibold">{t.ergebnisOk}</p>
              {bilanz.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {bilanz.map((b) => (
                    <li
                      key={b.k}
                      className="rounded-full bg-surface px-3 py-1 text-sm font-medium text-ink"
                    >
                      {`${b.v} ${t.bilanz[b.k]}`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
        {sp.ergebnis === "fehler" && (
          <section role="alert" className={`${bannerFehler} fade-up mb-8 flex items-start gap-3`}>
            <IconWarnung className="mt-0.5 size-6 shrink-0 text-bad-ink" />
            <div className="min-w-0">
              <p className="text-lg font-semibold text-bad-ink">{t.ergebnisFehler}</p>
              {fehler.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">
                  {fehler.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        <BackupFormulare />
      </PageShell>
    </>
  );
}
