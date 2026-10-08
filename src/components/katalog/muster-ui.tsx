// Kleine Darstellungsbausteine rund um das Bewegungsmuster (Punkt, Stufenanzeige), nur für
// Katalog, Plan und Verlauf. Farben kommen aus MUSTER_FARBE (ausgeschriebene Token-Klassen).
import { MUSTER, type Muster } from "@/domain/types";
import { MUSTER_FARBE } from "@/lib/muster-farbe";

/** Muster aus den ersten zwei Zeichen einer Übungs-ID (z. B. "ZV-04" → "ZV"). */
export function musterAusId(id: string): Muster | null {
  const m = id.slice(0, 2);
  return (MUSTER as readonly string[]).includes(m) ? (m as Muster) : null;
}

/** Runder Farbpunkt in der Musterfarbe (dekorativ). */
export function MusterPunkt({ muster, klasse = "size-2.5" }: { muster: Muster; klasse?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full ${MUSTER_FARBE[muster].fl} ${klasse}`}
    />
  );
}

/** Stufe 1 bis 5 als Punktreihe (dekorativ; der Text steht daneben oder im sr-only-Text). */
export function StufenPunkte({
  stufe,
  muster,
  klasse = "size-2",
}: {
  stufe: number;
  muster: Muster;
  klasse?: string;
}) {
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`rounded-full ${klasse} ${i <= stufe ? MUSTER_FARBE[muster].fl : "bg-fill-2"}`}
        />
      ))}
    </span>
  );
}
