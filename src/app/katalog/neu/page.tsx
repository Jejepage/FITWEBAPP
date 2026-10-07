import { ExerciseForm } from "@/components/katalog/exercise-form";
import { leereFormWerte } from "@/domain/exercise-form";
import { de } from "@/i18n/de";
import { speichereNeueUebung } from "../actions";

export default function NeuPage() {
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{de.katalog.neuTitel}</h1>
      <ExerciseForm
        aktion={speichereNeueUebung}
        werte={leereFormWerte()}
        abbrechenHref="/katalog"
        muster=""
      />
    </>
  );
}
