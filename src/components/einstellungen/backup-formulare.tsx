import { karte, knopfPrimaer, knopfSekundaer } from "@/components/ui";
import { de } from "@/i18n/de";

const t = de.daten;

const dateiFeld =
  "block w-full min-h-11 rounded-lg border border-line bg-surface px-3 py-2 text-base file:mr-3 file:rounded-md file:border-0 file:bg-fill-2 file:px-3 file:py-1.5";

/** Export-Links und Import-Formulare (Datei-Upload per POST an /api/import, ohne JavaScript). */
export function BackupFormulare() {
  return (
    <>
      <section className="mb-8" aria-labelledby="export-titel">
        <h2 id="export-titel" className="mb-3 text-xl font-semibold">
          {t.export}
        </h2>
        <div className="space-y-3">
          <div className={karte}>
            <a href="/api/export?art=alles" download className={`${knopfPrimaer} w-full`}>
              {t.exportAlles}
            </a>
            <p className="mt-2 text-sm text-ink-2">{t.exportAllesHilfe}</p>
          </div>
          <div className={karte}>
            <a href="/api/export?art=katalog" download className={`${knopfSekundaer} w-full`}>
              {t.exportKatalog}
            </a>
            <p className="mt-2 text-sm text-ink-2">{t.exportKatalogHilfe}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="import-titel">
        <h2 id="import-titel" className="mb-3 text-xl font-semibold">
          {t.import}
        </h2>
        <div className="space-y-3">
          <form method="post" action="/api/import" encType="multipart/form-data" className={karte}>
            <input type="hidden" name="art" value="katalog" />
            <h3 className="mb-1 font-semibold">{t.importKatalog}</h3>
            <p className="mb-3 text-sm text-ink-2">{t.importKatalogHilfe}</p>
            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium">{t.datei}</span>
              <input
                type="file"
                name="datei"
                accept=".json,application/json"
                required
                className={dateiFeld}
              />
            </label>
            <button type="submit" className={`${knopfSekundaer} w-full`}>
              {t.importKatalog}
            </button>
          </form>

          <form
            method="post"
            action="/api/import"
            encType="multipart/form-data"
            className={`${karte} border-warn`}
          >
            <input type="hidden" name="art" value="alles" />
            <h3 className="mb-1 font-semibold">{t.importAlles}</h3>
            <p className="mb-3 text-sm text-warn-ink">{t.importAllesHilfe}</p>
            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium">{t.datei}</span>
              <input
                type="file"
                name="datei"
                accept=".json,application/json"
                required
                className={dateiFeld}
              />
            </label>
            <label className="mb-3 flex min-h-12 items-start gap-3">
              <input
                type="checkbox"
                name="bestaetigt"
                value="ersetzen"
                required
                className="mt-1 size-6"
              />
              <span>{t.bestaetigung}</span>
            </label>
            <button type="submit" className={`${knopfSekundaer} w-full`}>
              {t.importAlles}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
