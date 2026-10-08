import Link from "next/link";
import { beschreibeBedingung } from "@/domain/equipment";
import type { Richtung, Spalte } from "@/domain/katalog-spalten";
import {
  BELASTUNGSARTEN,
  EQUIPMENT_AUSWAHL,
  EQUIPMENT_NAMEN,
  MUSTER,
  MUSTER_NAMEN,
  PRUEFSTATI,
  type Exercise,
} from "@/domain/types";
import { videoLink } from "@/domain/youtube";
import { de } from "@/i18n/de";
import type { FilterAuswahl } from "@/server/katalog-filter";
import type { Profil } from "@/server/profiles";
import { Badge } from "./badge";

const t = de.katalog;
const tt = t.tabelle;
export const FILTER_FORM_ID = "katalog-filter";

const feld =
  "block w-full min-h-10 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm font-normal text-neutral-900 focus:border-brand focus:outline-2 focus:outline-brand dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

function Auswahl({
  name,
  label,
  wert,
  optionen,
}: {
  name: string;
  label: string;
  wert: string;
  optionen: readonly { wert: string; text: string }[];
}) {
  return (
    <select
      name={name}
      form={FILTER_FORM_ID}
      aria-label={label}
      defaultValue={wert}
      className={feld}
    >
      {optionen.map((o) => (
        <option key={o.wert} value={o.wert}>
          {o.text}
        </option>
      ))}
    </select>
  );
}

const jaNein = (wert: boolean | undefined, ja: string, nein: string) =>
  wert === undefined ? "" : wert ? ja : nein;

/** Filterfeld unter einer Spaltenüberschrift (leer, wenn es für die Spalte keinen Filter gibt). */
function FilterZelle({
  spalte,
  filter,
  profile,
}: {
  spalte: Spalte;
  filter: FilterAuswahl;
  profile: Profil[];
}) {
  const alle = { wert: "", text: t.alle };
  switch (spalte) {
    case "name":
      return (
        <input
          type="search"
          name="q"
          form={FILTER_FORM_ID}
          defaultValue={filter.q ?? ""}
          placeholder={tt.suchePlatzhalter}
          aria-label={tt.suche}
          autoComplete="off"
          className={feld}
        />
      );
    case "stufe":
      return (
        <Auswahl
          name="stufe"
          label={`${t.stufe} filtern`}
          wert={filter.stufe ? String(filter.stufe) : ""}
          optionen={[
            alle,
            ...[1, 2, 3, 4, 5].map((s) => ({
              wert: String(s),
              text: String(s),
            })),
          ]}
        />
      );
    case "equipment":
      return (
        <div className="space-y-1">
          <Auswahl
            name="profil"
            label={t.profil}
            wert={filter.profilId ? String(filter.profilId) : ""}
            optionen={[
              { wert: "", text: tt.alleProfile },
              ...profile.map((p) => ({
                wert: String(p.id),
                text: tt.mitProfil(p.name),
              })),
            ]}
          />
          <Auswahl
            name="geraet"
            label={t.geraet}
            wert={filter.geraet ?? ""}
            optionen={[
              { wert: "", text: tt.alleGeraete },
              ...EQUIPMENT_AUSWAHL.map((a) => ({
                wert: a,
                text: tt.benoetigt(EQUIPMENT_NAMEN[a]),
              })),
            ]}
          />
        </div>
      );
    case "einseitig":
      return (
        <Auswahl
          name="einseitig"
          label={`${t.einseitig} filtern`}
          wert={jaNein(filter.einseitig, "ja", "nein")}
          optionen={[
            alle,
            { wert: "ja", text: t.ja },
            { wert: "nein", text: t.nein },
          ]}
        />
      );
    case "belastung":
      return (
        <Auswahl
          name="belastungsart"
          label={t.belastungsartFilter}
          wert={filter.belastungsart ?? ""}
          optionen={[
            alle,
            ...BELASTUNGSARTEN.map((b) => ({
              wert: b,
              text: t.belastungsarten[b],
            })),
          ]}
        />
      );
    case "muskeln":
      return (
        <input
          type="search"
          name="muskel"
          form={FILTER_FORM_ID}
          defaultValue={filter.muskel ?? ""}
          placeholder={tt.suchePlatzhalter}
          aria-label={tt.muskelSuche}
          autoComplete="off"
          className={feld}
        />
      );
    case "status":
      return (
        <Auswahl
          name="status"
          label={t.statusFilter}
          wert={filter.pruefstatus ?? ""}
          optionen={[
            alle,
            ...PRUEFSTATI.map((p) => ({ wert: p, text: t.feld.pruefstati[p] })),
          ]}
        />
      );
    case "aktiv":
      return (
        <Auswahl
          name="aktiv"
          label={t.aktivFilter}
          wert={filter.nurInaktive ? "inaktiv" : filter.inaktive ? "alle" : ""}
          optionen={[
            { wert: "", text: tt.aktivAktive },
            { wert: "inaktiv", text: tt.aktivInaktive },
            { wert: "alle", text: tt.aktivAlle },
          ]}
        />
      );
    case "video":
      return (
        <Auswahl
          name="video"
          label={t.videoFilter}
          wert={jaNein(filter.video, "mit", "ohne")}
          optionen={[
            alle,
            { wert: "mit", text: tt.mitVideo },
            { wert: "ohne", text: tt.ohneVideo },
          ]}
        />
      );
    default:
      return null;
  }
}

function Zelle({
  e,
  spalte,
  alle,
}: {
  e: Exercise;
  spalte: Spalte;
  alle: ReadonlyMap<string, Exercise>;
}) {
  switch (spalte) {
    case "name":
      return (
        <Link
          href={`/katalog/${e.id}`}
          className="font-medium text-brand hover:underline"
        >
          {e.name}
        </Link>
      );
    case "stufe":
      return <Badge>{t.stufeBadge(e.stufe)}</Badge>;
    case "equipment":
      return <span>{beschreibeBedingung(e.equipment)}</span>;
    case "einseitig":
      return <span>{e.einseitig ? tt.ja : tt.nein}</span>;
    case "belastung":
      return <span>{t.belastungsarten[e.belastungsart]}</span>;
    case "bereich":
      return <span className="whitespace-nowrap">{e.standardBereich}</span>;
    case "muskeln":
      return <span>{e.hauptmuskeln.join(", ")}</span>;
    case "steigerung":
      return (
        <span>
          {e.steigerungsart.map((s) => t.steigerungsarten[s]).join(" → ")}
        </span>
      );
    case "leiter": {
      const teil = (id: string | null, richtung: string) => {
        const ziel = id ? alle.get(id) : undefined;
        if (!id || !ziel) return null;
        return (
          <Link
            key={richtung}
            href={`/katalog/${id}`}
            title={`${richtung}: ${ziel.name}`}
            className="mr-2 whitespace-nowrap text-brand hover:underline"
          >
            {richtung === tt.leiterLeichter ? "↓" : "↑"} {id}
          </Link>
        );
      };
      const l = teil(e.leichterId, tt.leiterLeichter);
      const s = teil(e.schwererId, tt.leiterSchwerer);
      return l || s ? (
        <span>
          {l}
          {s}
        </span>
      ) : (
        <span>{tt.keineLeiter}</span>
      );
    }
    case "last":
      return (
        <span>
          {e.optionaleLast.length
            ? e.optionaleLast.map((a) => EQUIPMENT_NAMEN[a]).join(", ")
            : "–"}
        </span>
      );
    case "status":
      return e.pruefstatus === "zu_pruefen" ? (
        <Badge farbe="hinweis">{t.zuPruefen}</Badge>
      ) : (
        <Badge farbe="gut">{t.geprueft}</Badge>
      );
    case "aktiv":
      return <span>{e.aktiv ? tt.ja : t.inaktiv}</span>;
    case "video": {
      const v = videoLink(e.videoUrl);
      return v ? (
        <a
          href={v.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-brand hover:underline"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-4 fill-current"
          >
            <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
          </svg>
          {t.videoAnsehen}
          <span className="sr-only"> ({e.name})</span>
        </a>
      ) : (
        <span>{tt.nein}</span>
      );
    }
    case "id":
      return (
        <span className="whitespace-nowrap tabular-nums text-neutral-500">
          {e.id}
        </span>
      );
  }
}

/**
 * Katalog als Tabelle: gruppiert nach Bewegungsmuster, Filter in der Kopfzeile (GET-Formular
 * `katalog-filter`, verknüpft über das Attribut `form`), sortierbare Spalten. Der Tabellenbereich
 * scrollt bei Bedarf selbst (seitlich und senkrecht), die Kopfzeile bleibt dabei stehen.
 */
export function KatalogTabelle({
  items,
  alle,
  spalten,
  filter,
  profile,
  sortSpalte,
  richtung,
  sortLink,
}: {
  items: readonly Exercise[];
  alle: ReadonlyMap<string, Exercise>;
  spalten: readonly Spalte[];
  filter: FilterAuswahl;
  profile: Profil[];
  sortSpalte: Spalte | undefined;
  richtung: Richtung;
  /** Adresse, die nach dieser Spalte sortiert (wechselt auf-/absteigend) */
  sortLink: (spalte: Spalte) => string;
}) {
  const gruppen = MUSTER.map((m) => ({
    m,
    liste: items.filter((e) => e.muster === m),
  })).filter((g) => g.liste.length > 0);
  return (
    <div>
      <nav aria-label={tt.sprungmarken} className="mb-3 flex flex-wrap gap-2">
        {gruppen.map(({ m, liste }) => (
          <a
            key={m}
            href={`#muster-${m}`}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 text-sm hover:border-brand dark:border-neutral-700 dark:bg-neutral-900"
          >
            {MUSTER_NAMEN[m]}
            <span className="text-neutral-500">{liste.length}</span>
          </a>
        ))}
      </nav>
      <div className="max-h-[calc(100dvh-15rem)] overflow-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-left text-sm">
          <caption className="sr-only">{tt.tabelleBeschreibung}</caption>
          <thead className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950">
            <tr>
              {spalten.map((s) => {
                const aktiv = sortSpalte === s;
                return (
                  <th
                    key={s}
                    scope="col"
                    aria-sort={
                      aktiv
                        ? richtung === "auf"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className="whitespace-nowrap px-3 pb-1 pt-3 font-semibold"
                  >
                    <Link
                      href={sortLink(s)}
                      aria-label={tt.sortieren(tt.spalten[s])}
                      className="inline-flex min-h-8 items-center gap-1 hover:text-brand"
                    >
                      {tt.spalten[s]}
                      <span
                        aria-hidden="true"
                        className={aktiv ? "text-brand" : "text-neutral-400"}
                      >
                        {aktiv ? (richtung === "auf" ? "▲" : "▼") : "↕"}
                      </span>
                    </Link>
                  </th>
                );
              })}
            </tr>
            <tr>
              {spalten.map((s) => (
                <td
                  key={s}
                  className="border-b border-neutral-200 px-3 pb-3 align-top font-normal dark:border-neutral-800"
                >
                  <FilterZelle spalte={s} filter={filter} profile={profile} />
                </td>
              ))}
            </tr>
          </thead>
          {gruppen.map(({ m, liste }) => (
            <tbody key={m} aria-labelledby={`muster-${m}`}>
              <tr>
                <th
                  id={`muster-${m}`}
                  scope="rowgroup"
                  colSpan={spalten.length}
                  className="scroll-mt-44 border-b border-neutral-200 bg-neutral-100 px-3 py-2 text-left font-semibold dark:border-neutral-800 dark:bg-neutral-800"
                >
                  {MUSTER_NAMEN[m]}{" "}
                  <span className="font-normal text-neutral-500">({m})</span>
                  <span className="ml-2 font-normal text-neutral-500">
                    · {tt.gruppeZahl(liste.length)}
                  </span>
                </th>
              </tr>
              {liste.map((e) => (
                <tr
                  key={e.id}
                  className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/60 ${e.aktiv ? "" : "opacity-60"}`}
                >
                  {spalten.map((s) => {
                    const Zellentyp = s === "name" ? "th" : "td";
                    return (
                      <Zellentyp
                        key={s}
                        scope={s === "name" ? "row" : undefined}
                        className="border-b border-neutral-100 px-3 py-2.5 text-left align-top font-normal dark:border-neutral-800"
                      >
                        <Zelle e={e} spalte={s} alle={alle} />
                      </Zellentyp>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}
