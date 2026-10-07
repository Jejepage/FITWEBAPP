import type { ExerciseFormWerte, FormFehler } from "@/domain/exercise-form";

export interface FormState {
  fehler?: FormFehler;
  werte?: ExerciseFormWerte;
  /** Gewähltes Muster beim Anlegen, damit es nach einem Fehler erhalten bleibt. */
  muster?: string;
}
