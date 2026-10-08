import { speichereAnsicht } from "@/app/katalog/ansicht-actions";
import { IconTabelle } from "@/components/icons";
import { knopfPrimaer } from "@/components/ui";
import { PFLICHT_SPALTE, SPALTEN, type Spalte } from "@/domain/katalog-spalten";
import { de } from "@/i18n/de";

const t = de.katalog.tabelle;

/** Auswahl der Tabellenspalten (Häkchen); "Übernehmen" merkt sie im Cookie. */
export function SpaltenWahl({ spalten, zurueck }: { spalten: readonly Spalte[]; zurueck: string }) {
  return (
    <details className="relative">
      <summary className="press inline-flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-xl bg-fill-2 px-4 text-[15px] font-semibold text-ink hover:brightness-95 [&::-webkit-details-marker]:hidden">
        <IconTabelle className="size-5 text-ink-2" />
        {t.spaltenKnopf}
        <span className="font-medium text-ink-3">({spalten.length})</span>
      </summary>
      <form
        action={speichereAnsicht}
        className="fade-up absolute right-0 z-20 mt-2 w-80 rounded-card border border-line bg-surface p-4 shadow-xl"
      >
        <input type="hidden" name="was" value="spalten" />
        <input type="hidden" name="zurueck" value={zurueck} />
        <p className="mb-1 text-lg font-semibold">{t.spaltenTitel}</p>
        <p className="mb-3 text-sm text-ink-3">{t.spaltenHilfe}</p>
        <ul className="mb-4 grid grid-cols-2 gap-x-3">
          {SPALTEN.map((s) => (
            <li key={s}>
              <label className="flex min-h-11 items-center gap-2.5 text-[15px]">
                <input
                  type="checkbox"
                  name="spalte"
                  value={s}
                  defaultChecked={spalten.includes(s)}
                  disabled={s === PFLICHT_SPALTE}
                  className="size-5 accent-accent"
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
