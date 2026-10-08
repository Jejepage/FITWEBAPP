import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/katalog/badge";
import { Ladder } from "@/components/katalog/ladder";
import { karte, knopfPrimaer, knopfSekundaer } from "@/components/ui";
import { db } from "@/db/client";
import { beschreibeBedingung } from "@/domain/equipment";
import { EQUIPMENT_NAMEN, MUSTER_NAMEN } from "@/domain/types";
import { de } from "@/i18n/de";
import { getExercise, getLadder } from "@/server/exercises";
import { ladeUebungsVerlauf } from "@/server/verlauf";
import { aktivUmschalten, pruefstatusSetzen } from "../actions";

export const dynamic = "force-dynamic";

const t = de.katalog;

function Abschnitt({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className={`${karte} mb-4`}>
      <h2 className="mb-2 text-lg font-semibold">{titel}</h2>
      {children}
    </section>
  );
}

export default async function UebungPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = getExercise(db, id);
  if (!e) notFound();
  const kette = getLadder(db, id);
  const geprueft = e.pruefstatus === "geprueft";
  const hatVerlauf = (ladeUebungsVerlauf(db, id)?.verlauf.zeilen.length ?? 0) > 0;

  return (
    <>
      <Link href="/katalog" className="mb-3 inline-block min-h-11 py-2 text-brand">
        ← {t.zurueckZurListe}
      </Link>
      <h1 className="text-2xl font-bold">{e.name}</h1>
      <p className="mb-3 text-neutral-500">
        {e.id} · {MUSTER_NAMEN[e.muster]}
      </p>
      <div className="mb-4 flex flex-wrap gap-1.5">
        <Badge>{t.stufeBadge(e.stufe)}</Badge>
        {e.einseitig && <Badge>{t.einseitigBadge}</Badge>}
        <Badge farbe={geprueft ? "gut" : "hinweis"}>{geprueft ? t.geprueft : t.zuPruefen}</Badge>
        {!e.aktiv && <Badge farbe="grau">{t.inaktiv}</Badge>}
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Link href={`/katalog/${e.id}/bearbeiten`} className={knopfPrimaer}>
          {t.bearbeiten}
        </Link>
        <form action={pruefstatusSetzen.bind(null, e.id, geprueft ? "zu_pruefen" : "geprueft")}>
          <button type="submit" className={knopfSekundaer}>
            {geprueft ? t.markierenZuPruefen : t.markierenGeprueft}
          </button>
        </form>
        {hatVerlauf && (
          <Link href={`/verlauf/uebung/${e.id}`} className={knopfSekundaer}>
            {de.verlauf.verlaufAnsehen}
          </Link>
        )}
        <form action={aktivUmschalten.bind(null, e.id, !e.aktiv)}>
          <button type="submit" className={knopfSekundaer}>
            {e.aktiv ? t.deaktivieren : t.aktivieren}
          </button>
        </form>
      </div>

      <Abschnitt titel={t.ausfuehrung}>
        <ol className="list-decimal space-y-1 pl-5">
          {e.ausfuehrung.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </Abschnitt>

      <Abschnitt titel={t.fehler}>
        <ul className="list-disc space-y-1 pl-5">
          {e.fehler.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </Abschnitt>

      <Abschnitt titel={t.hinweise}>
        <p>{e.hinweise}</p>
      </Abschnitt>

      <Abschnitt titel={t.stufenleiter}>
        <Ladder kette={kette} aktuellId={e.id} />
      </Abschnitt>

      <section className={`${karte} mb-4`}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-neutral-500">{t.equipment}</dt>
          <dd>{beschreibeBedingung(e.equipment)}</dd>
          <dt className="text-neutral-500">{t.optionaleLast}</dt>
          <dd>
            {e.optionaleLast.length > 0
              ? e.optionaleLast.map((a) => EQUIPMENT_NAMEN[a]).join(", ")
              : t.keineOptionaleLast}
          </dd>
          <dt className="text-neutral-500">{t.hauptmuskeln}</dt>
          <dd>{e.hauptmuskeln.join(", ")}</dd>
          <dt className="text-neutral-500">{t.belastung}</dt>
          <dd>{t.belastungsarten[e.belastungsart]}</dd>
          <dt className="text-neutral-500">{t.standardBereich}</dt>
          <dd>
            {e.standardBereich}
            {e.einseitig ? " (pro Seite)" : ""}
          </dd>
          <dt className="text-neutral-500">{t.steigerung}</dt>
          <dd>{e.steigerungsart.map((s) => t.steigerungsarten[s]).join(" → ")}</dd>
        </dl>
      </section>
    </>
  );
}
