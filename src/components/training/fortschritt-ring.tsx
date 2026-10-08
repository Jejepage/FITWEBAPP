/**
 * Fortschrittsring: Anteil erledigter Sätze. Der Ring selbst ist dekorativ; die Rolle
 * "progressbar" mit aria-valuenow/-min/-max und Beschriftung steht auf dem Rahmen.
 */
export function FortschrittsRing({
  erledigt,
  gesamt,
  beschriftung,
  strichKlasse = "stroke-accent",
}: {
  erledigt: number;
  gesamt: number;
  beschriftung: string;
  /** Farbe des Fortschritts (ausgeschriebene stroke-Klasse, z. B. Musterfarbe) */
  strichKlasse?: string;
}) {
  const radius = 24;
  const umfang = 2 * Math.PI * radius;
  const anteil = gesamt > 0 ? Math.min(1, erledigt / gesamt) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={gesamt}
      aria-valuenow={erledigt}
      aria-label={beschriftung}
      className="relative size-16 shrink-0"
    >
      <svg viewBox="0 0 56 56" aria-hidden="true" className="size-full -rotate-90">
        <circle cx="28" cy="28" r={radius} fill="none" strokeWidth="6" className="stroke-fill-2" />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={umfang}
          strokeDashoffset={umfang * (1 - anteil)}
          className={`${strichKlasse} transition-[stroke-dashoffset] duration-500 ease-out`}
        />
      </svg>
      <span
        aria-hidden="true"
        className="absolute inset-0 grid place-items-center text-lg font-bold tabular-nums text-ink"
      >
        {erledigt}
      </span>
    </div>
  );
}
