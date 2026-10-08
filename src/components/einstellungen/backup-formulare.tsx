import { Checkbox } from "@/components/form-felder";
import {
  IconDownload,
  IconUpload,
  IconWarnung,
  SymbolKachel,
} from "@/components/einstellungen/icons-einstellungen";
import {
  bannerWarn,
  hilfstext,
  karte,
  knopfGefahr,
  knopfPrimaer,
  knopfSekundaer,
  kopfzeileKlein,
} from "@/components/ui";
import { de } from "@/i18n/de";

const t = de.daten;

const dateiFeld =
  "block w-full min-h-12 rounded-xl border border-line bg-fill px-3 py-1.5 text-base text-ink file:mr-3 file:min-h-9 file:cursor-pointer file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-1.5 file:text-[15px] file:font-semibold file:text-on-accent";

/** Export-Links und Import-Formulare (Datei-Upload per POST an /api/import, ohne JavaScript). */
export function BackupFormulare() {
  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
      <section aria-labelledby="export-titel">
        <h2 id="export-titel" className={kopfzeileKlein}>
          {t.export}
        </h2>
        <div className="space-y-4">
          <div className={karte}>
            <div className="mb-4 flex items-start gap-4">
              <SymbolKachel gross>
                <IconDownload />
              </SymbolKachel>
              <p className="pt-0.5 text-[15px] leading-snug text-ink-2">{t.exportAllesHilfe}</p>
            </div>
            <a href="/api/export?art=alles" download className={`${knopfPrimaer} w-full`}>
              {t.exportAlles}
            </a>
          </div>
          <div className={karte}>
            <div className="mb-4 flex items-start gap-4">
              <SymbolKachel gross ton="grau">
                <IconDownload />
              </SymbolKachel>
              <p className="pt-0.5 text-[15px] leading-snug text-ink-2">{t.exportKatalogHilfe}</p>
            </div>
            <a href="/api/export?art=katalog" download className={`${knopfSekundaer} w-full`}>
              {t.exportKatalog}
            </a>
          </div>
        </div>
      </section>

      <section aria-labelledby="import-titel">
        <h2 id="import-titel" className={kopfzeileKlein}>
          {t.import}
        </h2>
        <div className="space-y-4">
          <form method="post" action="/api/import" encType="multipart/form-data" className={karte}>
            <input type="hidden" name="art" value="katalog" />
            <div className="mb-4 flex items-start gap-4">
              <SymbolKachel gross ton="grau">
                <IconUpload />
              </SymbolKachel>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold tracking-tight text-ink">{t.importKatalog}</h3>
                <p className={`${hilfstext} mt-1`}>{t.importKatalogHilfe}</p>
              </div>
            </div>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-sm font-medium text-ink-2">{t.datei}</span>
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

          <form method="post" action="/api/import" encType="multipart/form-data" className={karte}>
            <input type="hidden" name="art" value="alles" />
            <div className="mb-4 flex items-start gap-4">
              <SymbolKachel gross ton="warn">
                <IconUpload />
              </SymbolKachel>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold tracking-tight text-ink">{t.importAlles}</h3>
              </div>
            </div>
            <p className={`${bannerWarn} mb-4 flex items-start gap-3 text-[15px] leading-snug`}>
              <IconWarnung className="mt-0.5 size-5 shrink-0 text-warn-ink" />
              <span>{t.importAllesHilfe}</span>
            </p>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-sm font-medium text-ink-2">{t.datei}</span>
              <input
                type="file"
                name="datei"
                accept=".json,application/json"
                required
                className={dateiFeld}
              />
            </label>
            <div className="mb-4">
              <Checkbox
                name="bestaetigt"
                value="ersetzen"
                label={t.bestaetigung}
                checked={false}
                required
              />
            </div>
            <button type="submit" className={`${knopfGefahr} w-full`}>
              {t.importAlles}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
