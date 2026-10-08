import { speichereAnsicht } from "@/app/katalog/ansicht-actions";
import { knopfPrimaer } from "@/components/ui";
import { PFLICHT_SPALTE, SPALTEN, type Spalte } from "@/domain/katalog-spalten";
import { de } from "@/i18n/de";

const t = de.katalog.tabelle;

/** Auswahl der Tabellenspalten (Häkchen); "Übernehmen" merkt sie im Cookie. */
export function SpaltenWahl({ spalten, zurueck }: { spalten: readonly Spalte[]; zurueck: string }) {
  return (
    <details className="relative">
      <summary className="inline-flex min-h-10 cursor-pointer list-none items-center rounded-xl border border-line bg-surface px-4 text-sm font-medium hover:bg-fill">
        {t.spaltenKnopf}
        <span className="ml-1.5 text-ink-3">({spalten.length})</span>
      </summary>
      <form
        action={speichereAnsicht}
        className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-line bg-surface p-4 shadow-lg"
      >
        <input type="hidden" name="was" value="spalten" />
        <input type="hidden" name="zurueck" value={zurueck} />
        <p className="mb-1 font-semibold">{t.spaltenTitel}</p>
        <p className="mb-2 text-xs text-ink-3">{t.spaltenHilfe}</p>
        <ul className="mb-3 grid grid-cols-2 gap-x-3">
          {SPALTEN.map((s) => (
            <li key={s}>
              <label className="flex min-h-10 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="spalte"
                  value={s}
                  defaultChecked={spalten.includes(s)}
                  disabled={s === PFLICHT_SPALTE}
                  className="size-4"
                />
                {t.spalten[s]}
              </label>
              {s === PFLICHT_SPALTE && <input type="hidden" name="spalte" value={s} />}
            </li>
          ))}
        </ul>
        <button type="submit" className={`${knopfPrimaer} w-full`}>
          {t.uebernehmen}
        </button>
      </form>
    </details>
  );
}
