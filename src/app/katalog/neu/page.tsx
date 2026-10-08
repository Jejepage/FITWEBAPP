import { ExerciseForm } from "@/components/katalog/exercise-form";
import { PageShell } from "@/components/page-shell";
import { leereFormWerte } from "@/domain/exercise-form";
import { de } from "@/i18n/de";
import { speichereNeueUebung } from "../actions";

export default function NeuPage() {
  return (
    <PageShell title={de.katalog.neuTitel} breite="normal">
      <ExerciseForm
        aktion={speichereNeueUebung}
        werte={leereFormWerte()}
        abbrechenHref="/katalog"
        muster=""
      />
    </PageShell>
  );
}
