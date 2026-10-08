import Link from "next/link";
import { AnsichtUmschalter } from "@/components/katalog/ansicht-umschalter";
import { ExerciseCard } from "@/components/katalog/exercise-card";
import {
  FILTER_FORM_ID,
  KatalogTabelle,
} from "@/components/katalog/katalog-tabelle";
import { FilterForm } from "@/components/katalog/filter-form";
import { FilterLive } from "@/components/katalog/filter-live";
import { SpaltenWahl } from "@/components/katalog/spalten-wahl";
import { knopfPrimaer, knopfSekundaer } from "@/components/ui";
import { db } from "@/db/client";
import {
  parseAnsicht,
  parseSpalten,
  sortiereKatalog,
  type Ansicht,
  type Spalte,
} from "@/domain/katalog-spalten";
import { MUSTER, MUSTER_NAMEN } from "@/domain/types";
import { de } from "@/i18n/de";
import { alleUebungen, listExercises } from "@/server/exercises";
import { liesAnsichtsWahl } from "@/server/katalog-ansicht";
import {
  filterParameter,
  hatFilter,
  parseKatalogFilter,
  type SearchParams,
} from "@/server/katalog-filter";
import { getProfile, listProfiles } from "@/server/profiles";

export const dynamic = "force-dynamic";

const t = de.katalog;
const tt = t.tabelle;

const erster = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

export default async function KatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const parsed = parseKatalogFilter(sp);
  const profile = listProfiles(db);
  const profil = parsed.profilId ? getProfile(db, parsed.profilId) : null;
  // Unbekanntes Profil (z. B. alter Link): Filter ignorieren und nicht als aktiv anzeigen.
  const auswahl = { ...parsed, profilId: profil?.id };
  const { items, gesamt } = listExercises(db, {
    muster: auswahl.muster,
    stufe: auswahl.stufe,
    einseitig: auswahl.einseitig,
    profilEquipment: profil?.equipment,
    inaktive: auswahl.inaktive,
    nurInaktive: auswahl.nurInaktive,
    nurZuPruefen: auswahl.nurZuPruefen,
    pruefstatus: auswahl.pruefstatus,
    q: auswahl.q,
    geraet: auswahl.geraet,
    belastungsart: auswahl.belastungsart,
    video: auswahl.video,
    muskel: auswahl.muskel,
  });

  // Ansicht und Spalten: Adresse vor Cookie vor Vorgabe
  const gemerkt = await liesAnsichtsWahl();
  const ansicht: Ansicht = erster(sp.ansicht)
    ? parseAnsicht(erster(sp.ansicht))
    : gemerkt.ansicht;
  const spalten: Spalte[] = erster(sp.spalten)
    ? parseSpalten(erster(sp.spalten))
    : gemerkt.spalten;
  const sortiert = sortiereKatalog(items, auswahl.sort, auswahl.dir ?? "auf");

  // Adressen, die Filter (und Sortierung) behalten
  const basis = filterParameter(auswahl);
  if (erster(sp.ansicht)) basis.set("ansicht", ansicht);
  if (erster(sp.spalten)) basis.set("spalten", spalten.join(","));
  const zurueck = new URLSearchParams(basis);
  if (auswahl.sort) {
    zurueck.set("sort", auswahl.sort);
    zurueck.set("dir", auswahl.dir ?? "auf");
  }
  const sortLink = (spalte: Spalte): string => {
    const p = new URLSearchParams(basis);
    const richtung =
      auswahl.sort === spalte && (auswahl.dir ?? "auf") === "auf"
        ? "ab"
        : "auf";
    p.set("sort", spalte);
    p.set("dir", richtung);
    return `/katalog?${p}`;
  };

  const katalog = new Map(alleUebungen(db).map((u) => [u.id, u]));
  const zeigeKarten = ansicht !== "tabelle";
  const zeigeTabelle = ansicht !== "karten";
  // "auto": Tabelle ab Tablet-/PC-Breite, darunter Karten
  const kartenKlasse = ansicht === "auto" ? "md:hidden" : "";
  const tabellenKlasse = ansicht === "auto" ? "hidden md:block" : "";
  const hatFilterAktiv = hatFilter(auswahl);
  // Filter ohne Eingabefeld in der Kopfzeile (Muster, abgewählte Spalten) bleiben als versteckte
  // Felder erhalten, damit ein Live-Filter sie nicht stillschweigend verliert.
  const felderDerSpalten: Record<Spalte, string[]> = {
    name: ["q"],
    stufe: ["stufe"],
    equipment: ["profil", "geraet"],
    einseitig: ["einseitig"],
    belastung: ["belastungsart"],
    bereich: [],
    muskeln: ["muskel"],
    steigerung: [],
    leiter: [],
    last: [],
    status: ["status"],
    aktiv: ["aktiv"],
    video: ["video"],
    id: [],
  };
  const sichtbareFelder = new Set(spalten.flatMap((s) => felderDerSpalten[s]));
  const versteckteFilter = Array.from(filterParameter(auswahl)).filter(
    ([name]) => !sichtbareFelder.has(name),
  );
  const kartenVersteckt: [string, string][] = [];
  if (auswahl.sort)
    kartenVersteckt.push(["sort", auswahl.sort], ["dir", auswahl.dir ?? "auf"]);
  if (erster(sp.ansicht)) kartenVersteckt.push(["ansicht", ansicht]);
  if (erster(sp.spalten)) kartenVersteckt.push(["spalten", spalten.join(",")]);

  const leer = (
    <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
      {t.leer}
    </p>
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t.titel}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <AnsichtUmschalter ansicht={ansicht} zurueck={zurueck.toString()} />
          <div
            className={
              tabellenKlasse ? "hidden md:block" : zeigeTabelle ? "" : "hidden"
            }
          >
            <SpaltenWahl spalten={spalten} zurueck={zurueck.toString()} />
          </div>
          <Link href="/katalog/neu" className={knopfPrimaer}>
            {t.neu}
          </Link>
        </div>
      </div>

      <p
        className="mb-4 text-sm text-neutral-600 dark:text-neutral-400"
        aria-live="polite"
      >
        {t.anzahl(items.length, gesamt)}
        {hatFilterAktiv && (
          <Link href="/katalog" className="ml-3 font-medium text-brand">
            {t.zuruecksetzen}
          </Link>
        )}
      </p>

      {zeigeKarten && (
        <div className={kartenKlasse}>
          <FilterForm
            filter={auswahl}
            profile={profile}
            aktiv={hatFilterAktiv}
            versteckt={kartenVersteckt}
          />
          {items.length === 0
            ? leer
            : MUSTER.map((m) => {
                const gruppe = items.filter((e) => e.muster === m);
                if (gruppe.length === 0) return null;
                return (
                  <section
                    key={m}
                    className="mb-6"
                    aria-labelledby={`karten-muster-${m}`}
                  >
                    <h2
                      id={`karten-muster-${m}`}
                      className="mb-2 text-lg font-semibold"
                    >
                      {MUSTER_NAMEN[m]}{" "}
                      <span className="text-sm font-normal text-neutral-500">
                        ({m})
                      </span>
                    </h2>
                    <ul className="space-y-2">
                      {gruppe.map((e) => (
                        <li key={e.id}>
                          <ExerciseCard e={e} />
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
        </div>
      )}

      {zeigeTabelle && (
        <div className={tabellenKlasse}>
          <form
            id={FILTER_FORM_ID}
            method="get"
            action="/katalog"
            className="mb-3 flex gap-2"
          >
            {auswahl.sort && (
              <input type="hidden" name="sort" value={auswahl.sort} />
            )}
            {auswahl.sort && (
              <input type="hidden" name="dir" value={auswahl.dir ?? "auf"} />
            )}
            {erster(sp.ansicht) && (
              <input type="hidden" name="ansicht" value={ansicht} />
            )}
            {erster(sp.spalten) && (
              <input type="hidden" name="spalten" value={spalten.join(",")} />
            )}
            {versteckteFilter.map(([name, wert]) => (
              <input key={name} type="hidden" name={name} value={wert} />
            ))}
            <noscript>
              <button type="submit" className={knopfSekundaer}>
                {tt.filtern}
              </button>
            </noscript>
          </form>
          <FilterLive formId={FILTER_FORM_ID} ziel="/katalog" />
          {items.length === 0 && leer}
          {/* Immer derselbe Baum, damit die Kopfzeile bei 0 Treffern nicht neu aufgebaut wird
              (sonst gingen Fokus und Eingabe verloren) */}
          <div className={items.length === 0 ? "mt-3" : ""}>
            <KatalogTabelle
              items={sortiert}
              alle={katalog}
              spalten={spalten}
              filter={auswahl}
              profile={profile}
              sortSpalte={auswahl.sort}
              richtung={auswahl.dir ?? "auf"}
              sortLink={sortLink}
            />
          </div>
        </div>
      )}
    </>
  );
}
