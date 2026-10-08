import type { VorschlagGrund } from "@/domain/training-types";
import { de } from "./de";

/** Erklärung zum Vorschlag; `null`, wenn es nichts zu sagen gibt (gleiches Ziel wie zuletzt). */
export function vorschlagGrundText(
  grund: VorschlagGrund,
  schwererName: string | null,
): string | null {
  const t = de.training.vorschlag;
  if (grund === "wiederholen") return null;
  if (grund === "naechste_stufe") {
    return schwererName ? t.naechste_stufe_name(schwererName) : t.naechste_stufe;
  }
  return t[grund];
}
