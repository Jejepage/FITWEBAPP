import Link from "next/link";
import { IconPlay } from "@/components/icons";
import { beschreibeBedingung } from "@/domain/equipment";
import type { Richtung, Spalte } from "@/domain/katalog-spalten";
import {
  BELASTUNGSARTEN,
  EQUIPMENT_AUSWAHL,
  EQUIPMENT_NAMEN,
  MUSTER,
  MUSTER_NAMEN,
  PRUEFSTATI,
  type EquipmentArt,
  type Exercise,
} from "@/domain/types";
import { videoLink } from "@/domain/youtube";
import { de } from "@/i18n/de";
import { MUSTER_FARBE } from "@/lib/muster-farbe";
import type { FilterAuswahl } from "@/server/katalog-filter";
import { Badge } from "./badge";
import { MusterPunkt, StufenPunkte } from "./muster-ui";

const t = de.katalog;
const tt = t.tabelle;
export const FILTER_FORM_ID = "katalog-filter";

// Filterfelder in der Kopfzeile im Pillen-Stil; 16 px Schrift, damit das iPad nicht zoomt
const feld =
  "block w-full min-w-24 min-h-11 rounded-full border border-transparent bg-fill px-3.5 py-1.5 text-base font-normal text-ink placeholder:text-ink-3 transition-colors focus:border-accent focus:bg-surface focus:outline-2 focus:outline-offset-0 focus:outline-accent/40";

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
  planEquipment,
}: {
  spalte: Spalte;
  filter: FilterAuswahl;
  planEquipment: readonly EquipmentArt[] | null;
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
          {planEquipment && (
            <Auswahl
              name="machbar"
              label={t.machbar}
              wert={filter.machbar ? "ja" : ""}
              optionen={[
                { wert: "", text: tt.alleUebungen },
                { wert: "ja", text: tt.nurMachbar },
              ]}
            />
          )}
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
          optionen={[alle, { wert: "ja", text: t.ja }, { wert: "nein", text: t.nein }]}
        />
      );
    case "ersatz":
      return (
        <Auswahl
          name="ersatz"
          label={`${t.ersatzFilter} filtern`}
          wert={jaNein(filter.ersatz, "ja", "nein")}
          optionen={[alle, { wert: "ja", text: t.ja }, { wert: "nein", text: t.nein }]}
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
          optionen={[alle, ...PRUEFSTATI.map((p) => ({ wert: p, text: t.feld.pruefstati[p] }))]}
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
        <span className="flex items-start gap-2.5">
          <span className="mt-2 shrink-0">
            <MusterPunkt muster={e.muster} />
          </span>
          <span className="min-w-0">
            <Link
              href={`/katalog/${e.id}`}
              className={`text-[15px] font-semibold hover:underline ${e.aktiv ? "text-accent-ink" : "text-ink-2"}`}
            >
              {e.name}
            </Link>
            {!e.aktiv && (
              <span className="ml-2">
                <Badge farbe="grau">{t.inaktiv}</Badge>
              </span>
            )}
          </span>
        </span>
      );
    case "stufe":
      return (
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          <StufenPunkte stufe={e.stufe} muster={e.muster} />
          <span className="sr-only">{t.stufeBadge(e.stufe)}</span>
          <span aria-hidden="true" className="text-sm font-semibold tabular-nums text-ink-2">
            {e.stufe}
          </span>
        </span>
      );
    case "equipment":
      return (
        <span className="flex flex-wrap gap-1.5">
          {beschreibeBedingung(e.equipment)
            .split(" + ")
            .map((teil) => (
              <span
                key={teil}
                className="rounded-full bg-fill-2 px-2.5 py-0.5 text-[13px] font-medium text-ink-2"
              >
                {teil}
              </span>
            ))}
        </span>
      );
    case "einseitig":
      return e.einseitig ? <Badge farbe="akzent">{tt.ja}</Badge> : <span>{tt.nein}</span>;
    case "ersatz":
      return e.ersatz ? <Badge farbe="hinweis">{tt.ja}</Badge> : <span>{tt.nein}</span>;
    case "belastung":
      return <span>{t.belastungsarten[e.belastungsart]}</span>;
    case "bereich":
      return <span className="whitespace-nowrap">{e.standardBereich}</span>;
    case "muskeln":
      return <span>{e.hauptmuskeln.join(", ")}</span>;
    case "steigerung":
      return <span>{e.steigerungsart.map((s) => t.steigerungsarten[s]).join(" → ")}</span>;
    case "leiter": {
      const teil = (id: string | null, richtung: string) => {
        const ziel = id ? alle.get(id) : undefined;
        if (!id || !ziel) return null;
        return (
          <Link
            key={richtung}
            href={`/katalog/${id}`}
            title={`${richtung}: ${ziel.name}`}
            className={`mr-1.5 inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-semibold hover:brightness-95 ${MUSTER_FARBE[e.muster].soft} ${MUSTER_FARBE[e.muster].ink}`}
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
    case "status":
      return e.pruefstatus === "zu_pruefen" ? (
        <Badge farbe="hinweis">{t.zuPruefen}</Badge>
      ) : (
        <Badge farbe="gut">{t.geprueft}</Badge>
      );
    case "aktiv":
      return e.aktiv ? <span>{tt.ja}</span> : <Badge farbe="grau">{t.inaktiv}</Badge>;
    case "video": {
      const v = videoLink(e.videoUrl);
      return v ? (
        <a
          href={v.url}
          target="_blank"
          rel="noopener noreferrer"
          className="press inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent-ink hover:brightness-95"
        >
          <IconPlay className="size-3.5" />
          {t.videoAnsehen}
          <span className="sr-only"> ({e.name})</span>
        </a>
      ) : (
        <span>{tt.nein}</span>
      );
    }
    case "id":
      return <span className="whitespace-nowrap tabular-nums text-ink-3">{e.id}</span>;
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
  planEquipment,
  sortSpalte,
  richtung,
  sortLink,
}: {
  items: readonly Exercise[];
  alle: ReadonlyMap<string, Exercise>;
  spalten: readonly Spalte[];
  filter: FilterAuswahl;
  planEquipment: readonly EquipmentArt[] | null;
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
      <nav aria-label={tt.sprungmarken} className="mb-4 flex flex-wrap gap-2">
        {gruppen.map(({ m, liste }) => {
          const farbe = MUSTER_FARBE[m];
          return (
            <a
              key={m}
              href={`#muster-${m}`}
              className={`press inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold hover:brightness-95 ${farbe.soft} ${farbe.ink}`}
            >
              <MusterPunkt muster={m} klasse="size-2" />
              {MUSTER_NAMEN[m]}
              <span className="tabular-nums">{liste.length}</span>
            </a>
          );
        })}
      </nav>
      <div className="relative max-h-[calc(100dvh-15rem)] min-h-80 overflow-auto rounded-card border border-line/50 bg-surface shadow-card">
        <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-left text-sm">
          <caption className="sr-only">{tt.tabelleBeschreibung}</caption>
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              {spalten.map((s) => {
                const aktiv = sortSpalte === s;
                return (
                  <th
                    key={s}
                    scope="col"
                    aria-sort={aktiv ? (richtung === "auf" ? "ascending" : "descending") : "none"}
                    className="whitespace-nowrap px-4 pb-1 pt-4 text-[13px] font-semibold text-ink-3"
                  >
                    <Link
                      href={sortLink(s)}
                      aria-label={tt.sortieren(tt.spalten[s])}
                      className={`inline-flex min-h-10 items-center gap-1 hover:text-ink ${aktiv ? "text-accent-ink" : ""}`}
                    >
                      {tt.spalten[s]}
                      <span aria-hidden="true" className={aktiv ? "text-accent-ink" : "text-ink-3"}>
                        {aktiv ? (richtung === "auf" ? "▲" : "▼") : "↕"}
                      </span>
                    </Link>
                  </th>
                );
              })}
            </tr>
            <tr>
              {spalten.map((s) => (
                <td key={s} className="border-b border-line px-4 pb-3 pt-1 align-top font-normal">
                  <FilterZelle spalte={s} filter={filter} planEquipment={planEquipment} />
                </td>
              ))}
            </tr>
          </thead>
          {gruppen.map(({ m, liste }) => {
            const farbe = MUSTER_FARBE[m];
            return (
              <tbody key={m} aria-labelledby={`muster-${m}`}>
                <tr>
                  <th
                    id={`muster-${m}`}
                    scope="rowgroup"
                    colSpan={spalten.length}
                    className={`scroll-mt-36 border-b border-line px-4 py-2.5 text-left text-[15px] font-semibold ${farbe.soft} ${farbe.ink}`}
                  >
                    <MusterPunkt muster={m} klasse="mr-2.5 size-3" />
                    {MUSTER_NAMEN[m]} <span className="font-normal">({m})</span>
                    <span className="ml-2 font-normal">· {tt.gruppeZahl(liste.length)}</span>
                  </th>
                </tr>
                {liste.map((e) => (
                  <tr key={e.id} className="transition-colors odd:bg-fill/50 hover:bg-accent-soft">
                    {spalten.map((s) => {
                      const Zellentyp = s === "name" ? "th" : "td";
                      return (
                        <Zellentyp
                          key={s}
                          scope={s === "name" ? "row" : undefined}
                          className={`border-b border-line/60 px-4 py-3 text-left align-middle font-normal ${e.aktiv ? "text-ink" : "text-ink-2"}`}
                        >
                          <Zelle e={e} spalte={s} alle={alle} />
                        </Zellentyp>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}
