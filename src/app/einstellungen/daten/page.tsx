import Link from "next/link";
import { BackupFormulare } from "@/components/einstellungen/backup-formulare";
import { karte } from "@/components/ui";
import { de } from "@/i18n/de";
import type { SearchParams } from "@/server/katalog-filter";

export const dynamic = "force-dynamic";

const t = de.daten;
const BILANZ = ["uebungen", "neu", "profile", "plaene", "einheiten", "saetze"] as const;

export default async function DatenPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const fehler = (Array.isArray(sp.fehler) ? sp.fehler : sp.fehler ? [sp.fehler] : []).slice(0, 11);
  const bilanz = BILANZ.flatMap((k) => {
    const v = sp[k];
    return typeof v === "string" && /^\d{1,7}$/.test(v) ? [{ k, v }] : [];
  });

  return (
    <>
      <Link href="/einstellungen" className="mb-3 inline-block min-h-11 py-2 text-brand">
        ← {t.zurueck}
      </Link>
      <h1 className="mb-2 text-2xl font-bold">{t.titel}</h1>
      <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">{t.hilfe}</p>

      {sp.ergebnis === "ok" && (
        <section
          role="status"
          className="mb-6 rounded-lg bg-emerald-50 p-3 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
        >
          <p className="font-medium">{t.ergebnisOk}</p>
          <p className="text-sm">{bilanz.map((b) => `${b.v} ${t.bilanz[b.k]}`).join(" · ")}</p>
        </section>
      )}
      {sp.ergebnis === "fehler" && (
        <section role="alert" className={`${karte} mb-6 border-red-300 dark:border-red-800`}>
          <p className="mb-2 font-medium text-red-800 dark:text-red-200">{t.ergebnisFehler}</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {fehler.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </section>
      )}

      <BackupFormulare />
    </>
  );
}
