import { notFound } from "next/navigation";
import { ExerciseForm } from "@/components/katalog/exercise-form";
import { db } from "@/db/client";
import { exerciseZuFormWerte } from "@/domain/exercise-form";
import { de } from "@/i18n/de";
import { getExercise, leiterKandidaten } from "@/server/exercises";
import { speichereUebung } from "../../actions";

export const dynamic = "force-dynamic";

export default async function BearbeitenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = getExercise(db, id);
  if (!e) notFound();
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{de.katalog.bearbeitenTitel(e.name)}</h1>
      <ExerciseForm
        aktion={speichereUebung.bind(null, id)}
        werte={exerciseZuFormWerte(e)}
        abbrechenHref={`/katalog/${id}`}
        kandidaten={leiterKandidaten(db, e)}
      />
    </>
  );
}
