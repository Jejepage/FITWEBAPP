import Link from "next/link";
import { IconChevron } from "@/components/katalog/icons-katalog";
import { MusterPunkt } from "@/components/katalog/muster-ui";
import { PageShell } from "@/components/page-shell";
import { BlockUebersicht } from "@/components/verlauf/block-uebersicht";
import { EinheitenListe } from "@/components/verlauf/einheiten-liste";
import { abschnittTitel, gruppe, karte, knopfSekundaer } from "@/components/ui";
import { db } from "@/db/client";
import { MUSTER, MUSTER_NAMEN } from "@/domain/types";
import { de } from "@/i18n/de";
import type { SearchParams } from "@/server/katalog-filter";
import { blockUebersicht, listeEinheiten, uebungenMitVerlauf } from "@/server/verlauf";

export const dynamic = "force-dynamic";

const t = de.verlauf;
const LIMIT = 50;

export default async function VerlaufPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const alle = sp.alle === "1";
  const { liste, gesamt } = listeEinheiten(db, alle ? undefined : LIMIT);
  const uebungen = uebungenMitVerlauf(db);

  return (
    <PageShell title={t.titel} breite="weit">
      {/* PC: Blöcke und Einheiten links, Übungen rechts */}
      <div className="lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-10">
        <div className="min-w-0">
          <BlockUebersicht bloecke={blockUebersicht(db)} />

          <section aria-labelledby="einheiten-titel" className="mb-8">
            <h2 id="einheiten-titel" className={`${abschnittTitel} mb-3`}>
              {t.einheiten}
            </h2>
            {liste.length === 0 ? (
              <div className={`${karte} text-center`}>
                <p className="font-semibold">{t.keineEinheiten}</p>
                <p className="text-[15px] text-ink-2">{t.keineEinheitenHilfe}</p>
              </div>
            ) : (
              <EinheitenListe einheiten={liste} />
            )}
            {!alle && gesamt > LIMIT && (
              <Link href="/verlauf?alle=1" className={`${knopfSekundaer} mt-4 w-full`}>
                {t.alleAnzeigen(gesamt)}
              </Link>
            )}
          </section>
        </div>

        <section aria-labelledby="uebungen-titel" className="min-w-0">
          <h2 id="uebungen-titel" className={abschnittTitel}>
            {t.uebungen}
          </h2>
          <p className="mb-3 mt-1 text-[15px] text-ink-3">{t.uebungenHilfe}</p>
          {uebungen.length === 0 ? (
            <p className="text-[15px] text-ink-3">{t.keineUebungen}</p>
          ) : (
            MUSTER.map((m) => {
              const liste = uebungen.filter((u) => u.muster === m);
              if (liste.length === 0) return null;
              return (
                <div key={m} className="mb-5">
                  <h3 className="mb-2 flex items-center gap-2 px-1 text-sm font-medium uppercase tracking-wide text-ink-3">
                    <MusterPunkt muster={m} />
                    {MUSTER_NAMEN[m]}
                  </h3>
                  <ul className={gruppe}>
                    {liste.map((u) => (
                      <li key={u.id}>
                        <Link
                          href={`/verlauf/uebung/${u.id}`}
                          className="press flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-fill"
                        >
                          <span className="font-medium">{u.name}</span>
                          <span className="flex shrink-0 items-center gap-2 text-sm text-ink-3">
                            {t.einheitenAnzahl(u.einheiten)}
                            <IconChevron className="size-4" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </section>
      </div>
    </PageShell>
  );
}
