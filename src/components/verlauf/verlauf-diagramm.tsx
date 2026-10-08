import type { JSX } from "react";
import { de } from "@/i18n/de";

export interface DiagrammPunkt {
  /** ISO-Datum yyyy-mm-dd */
  datum: string;
  wert: number;
  /** Tooltip-Text, z. B. "12 kg × 10" oder "1.240 kg" */
  label: string;
  adHoc: boolean;
}

const TEXT = de.verlauf.diagramm;

// viewBox nahe der Handybreite, damit die Schrift bei 390 px effektiv ≥ 11 px bleibt.
const B = 360;
const H = 220;
const OBEN = 28;
const UNTEN = 32;
const RECHTS = 20;
const SCHRIFT = 13;

const zahl = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });
const kurzesDatum = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});
const langesDatum = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

function formatDatum(iso: string, format: Intl.DateTimeFormat): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : format.format(d);
}

/** Kleinste runde Schrittweite (1, 2, 5 × 10^n), die mindestens `roh` beträgt. */
function schoenerSchritt(roh: number): number {
  const basis = 10 ** Math.floor(Math.log10(roh));
  const bruch = roh / basis;
  const m = bruch <= 1 ? 1 : bruch <= 2 ? 2 : bruch <= 5 ? 5 : 10;
  return m * basis;
}

const runden = (v: number) => Math.round(v * 1e9) / 1e9;

/** Y-Skala mit 3 bis 5 runden Gitterwerten. */
function skala(werte: readonly number[]): {
  ticks: number[];
  min: number;
  max: number;
} {
  const dataMin = Math.min(...werte);
  const dataMax = Math.max(...werte);
  let lo = dataMin;
  let hi = dataMax;
  if (hi === lo) {
    // Ein Punkt oder identische Werte: Raum um den Wert schaffen.
    const abstand = Math.max(1, Math.abs(hi) * 0.1);
    lo -= abstand;
    hi += abstand;
  } else if (lo > 0 && lo < hi * 0.5) {
    // Weit auseinander: bei 0 beginnen, sonst täuscht die Skala.
    lo = 0;
  }
  if (dataMin >= 0) lo = Math.max(0, lo);
  const schritt = schoenerSchritt((hi - lo) / 3);
  const min = runden(Math.floor(lo / schritt) * schritt);
  const max = runden(Math.ceil(hi / schritt) * schritt);
  const ticks: number[] = [];
  for (let i = 0; min + i * schritt <= max + schritt / 1000; i++)
    ticks.push(runden(min + i * schritt));
  return { ticks, min, max: ticks[ticks.length - 1] ?? max };
}

/** Bis zu 5 gleichmäßig verteilte Indizes (immer erster und letzter). */
function achsenIndizes(n: number): number[] {
  const anzahl = Math.min(n, 5);
  if (anzahl <= 1) return [0];
  const set = new Set<number>();
  for (let k = 0; k < anzahl; k++) set.add(Math.round((k * (n - 1)) / (anzahl - 1)));
  return [...set];
}

const KLASSE_GITTER = "stroke-line";
const KLASSE_ACHSE = "stroke-line";
const KLASSE_TEXT = "fill-ink-2";
const KLASSE_LINIE = "stroke-brand";
const KLASSE_FLAECHE = "fill-white";

/** Liniendiagramm als Inline-SVG. X-Achse nach Reihenfolge der Einheiten, nicht nach Zeitabstand. */
export function VerlaufDiagramm({
  punkte,
  einheit,
  titel,
}: {
  punkte: readonly DiagrammPunkt[];
  einheit: string;
  titel: string;
}): JSX.Element {
  const daten = punkte.filter((p) => Number.isFinite(p.wert));
  if (daten.length === 0) return <p className="text-sm text-ink-3">{TEXT.keineDaten}</p>;

  const n = daten.length;
  const { ticks, min, max } = skala(daten.map((p) => p.wert));
  const tickTexte = ticks.map((t) => zahl.format(t));
  const links = Math.max(34, 14 + Math.max(...tickTexte.map((t) => t.length)) * 7.5);
  const breite = B - links - RECHTS;
  const hoehe = H - OBEN - UNTEN;
  const unten = OBEN + hoehe;

  const px = (i: number) => (n === 1 ? links + breite / 2 : links + (i * breite) / (n - 1));
  const py = (v: number) => OBEN + hoehe * (1 - (v - min) / (max - min));

  const radius = n > 30 ? 2.5 : n > 15 ? 3.5 : 4.5;
  const treffer = Math.min(14, Math.max(radius + 2, n > 1 ? breite / (n - 1) / 2 : 14));
  const linie = daten.map(
    (p, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)} ${py(p.wert).toFixed(1)}`,
  );

  const werte = daten.map((p) => p.wert);
  const beschreibung = TEXT.beschreibung(
    n,
    formatDatum(daten[0]?.datum ?? "", langesDatum),
    formatDatum(daten[n - 1]?.datum ?? "", langesDatum),
    zahl.format(Math.min(...werte)),
    zahl.format(Math.max(...werte)),
    einheit,
  );
  const hatAdHoc = daten.some((p) => p.adHoc);
  const hatGeplant = daten.some((p) => !p.adHoc);

  return (
    <svg
      role="img"
      aria-label={titel}
      viewBox={`0 0 ${B} ${H}`}
      className="block h-auto w-full"
      fontSize={SCHRIFT}
    >
      <title>{titel}</title>
      <desc>{beschreibung}</desc>

      {/* Gitter und Y-Beschriftung */}
      {ticks.map((t, i) => {
        const y = py(t);
        return (
          <g key={t}>
            <line
              x1={links}
              x2={B - RECHTS}
              y1={y}
              y2={y}
              strokeWidth={1}
              className={i === 0 ? KLASSE_ACHSE : KLASSE_GITTER}
            />
            <text
              x={links - 6}
              y={y}
              dy="0.32em"
              textAnchor="end"
              className={KLASSE_TEXT}
              aria-hidden
            >
              {tickTexte[i]}
            </text>
          </g>
        );
      })}

      {/* Einheit der Y-Achse und Legende der Punktarten */}
      <text x={2} y={14} className={KLASSE_TEXT} aria-hidden>
        {einheit}
      </text>
      <g aria-hidden>
        {hatAdHoc && (
          <g transform={`translate(${B - RECHTS - 62} 9)`}>
            <circle
              cx={5}
              cy={0}
              r={4.5}
              strokeWidth={2}
              className={`${KLASSE_FLAECHE} ${KLASSE_LINIE}`}
            />
            <text x={15} y={0} dy="0.32em" className={KLASSE_TEXT}>
              {TEXT.adHoc}
            </text>
          </g>
        )}
        {hatAdHoc && hatGeplant && (
          <g transform={`translate(${B - RECHTS - 150} 9)`}>
            <circle cx={5} cy={0} r={4.5} className="fill-brand" />
            <text x={15} y={0} dy="0.32em" className={KLASSE_TEXT}>
              {TEXT.geplant}
            </text>
          </g>
        )}
      </g>

      {/* X-Beschriftung */}
      {achsenIndizes(n).map((i) => (
        <text
          key={i}
          x={px(i)}
          y={unten + 20}
          textAnchor="middle"
          className={KLASSE_TEXT}
          aria-hidden
        >
          {formatDatum(daten[i]?.datum ?? "", kurzesDatum)}
        </text>
      ))}

      {/* Verlauf */}
      {n > 1 && (
        <path
          d={linie.join(" ")}
          fill="none"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          className={KLASSE_LINIE}
        />
      )}

      {/* Punkte: gefüllt = geplant, offen = Ad-hoc */}
      {daten.map((p, i) => (
        <g key={`${p.datum}-${i}`}>
          <title>
            {`${formatDatum(p.datum, langesDatum)}: ${p.label}${p.adHoc ? ` (${TEXT.adHoc})` : ""}`}
          </title>
          <circle cx={px(i)} cy={py(p.wert)} r={treffer} fill="transparent" />
          {p.adHoc ? (
            <circle
              cx={px(i)}
              cy={py(p.wert)}
              r={radius}
              strokeWidth={2}
              className={`${KLASSE_FLAECHE} ${KLASSE_LINIE}`}
            />
          ) : (
            <circle
              cx={px(i)}
              cy={py(p.wert)}
              r={radius}
              strokeWidth={1.5}
              className="fill-brand stroke-white"
            />
          )}
        </g>
      ))}
    </svg>
  );
}
