import Link from "next/link";
import { eingabe, knopfPrimaer, knopfSekundaer } from "@/components/ui";
import { MUSTER, MUSTER_NAMEN } from "@/domain/types";
import { de } from "@/i18n/de";
import type { FilterAuswahl } from "@/server/katalog-filter";
import type { Profil } from "@/server/profiles";

const t = de.katalog;

/** Reines GET-Formular: funktioniert ohne JavaScript, Filter stehen in der URL. */
export function FilterForm({
  filter,
  profile,
  aktiv,
}: {
  filter: FilterAuswahl;
  profile: Profil[];
  aktiv: boolean;
}) {
  const einseitigWert = filter.einseitig === undefined ? "" : filter.einseitig ? "ja" : "nein";
  return (
    <details
      open={aktiv}
      className="mb-4 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
    >
      <summary className="min-h-11 cursor-pointer list-none px-4 py-3 font-medium">
        {t.filter}
        {aktiv && <span className="ml-2 text-sm font-normal text-brand">●</span>}
      </summary>
      <form
        method="get"
        action="/katalog"
        className="grid gap-3 border-t border-neutral-200 p-4 dark:border-neutral-800 sm:grid-cols-2"
      >
        <label className="block text-sm">
          <span className="mb-1 block">{t.muster}</span>
          <select name="muster" defaultValue={filter.muster ?? ""} className={eingabe}>
            <option value="">{t.alle}</option>
            {MUSTER.map((m) => (
              <option key={m} value={m}>
                {MUSTER_NAMEN[m]} ({m})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block">{t.profil}</span>
          <select name="profil" defaultValue={filter.profilId ?? ""} className={eingabe}>
            <option value="">{t.alle}</option>
            {profile.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block">{t.stufe}</span>
          <select name="stufe" defaultValue={filter.stufe ?? ""} className={eingabe}>
            <option value="">{t.alle}</option>
            {[1, 2, 3, 4, 5].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block">{t.einseitig}</span>
          <select name="einseitig" defaultValue={einseitigWert} className={eingabe}>
            <option value="">{t.alle}</option>
            <option value="ja">{t.ja}</option>
            <option value="nein">{t.nein}</option>
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-2">
          <input
            type="checkbox"
            name="inaktive"
            value="1"
            defaultChecked={filter.inaktive}
            className="size-5"
          />
          {t.inaktiveZeigen}
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-2">
          <input
            type="checkbox"
            name="offen"
            value="1"
            defaultChecked={filter.nurZuPruefen}
            className="size-5"
          />
          {t.nurZuPruefen}
        </label>
        <div className="flex gap-3 sm:col-span-2">
          <button type="submit" className={knopfPrimaer}>
            {t.filtern}
          </button>
          <Link href="/katalog" className={knopfSekundaer}>
            {t.zuruecksetzen}
          </Link>
        </div>
      </form>
    </details>
  );
}
