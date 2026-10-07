import { describe, expect, it } from "vitest";
import {
  leereProfilFormWerte,
  parseProfilForm,
  profilZuFormWerte,
  validiereProfil,
} from "./profile-form";

function formular(felder: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(felder))
    for (const w of Array.isArray(v) ? v : [v]) fd.append(k, w);
  return fd;
}

describe("parseProfilForm / validiereProfil", () => {
  it("liest Name, Equipment, Gewichte und Standard", () => {
    const w = parseProfilForm(
      formular({
        name: "  Garage ",
        equipment: ["kurzhanteln", "bank", "hantelbank"],
        gewichte_kurzhanteln: "2–20/2",
        gewichte_kettlebell: "12, 16",
        istStandard: "on",
      }),
    );
    expect(w.name).toBe("Garage");
    expect(w.equipment).toEqual(["kurzhanteln", "bank"]); // unbekannte Arten fallen weg
    const r = validiereProfil(w);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.profil.gewichte).toEqual({ kurzhanteln: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20] });
      expect(r.profil.istStandard).toBe(true);
    }
  });

  it("Gewichte nur für angekreuzte Arten (Kettlebell-Text wird ignoriert, auch wenn ungültig)", () => {
    const w = parseProfilForm(
      formular({
        name: "A",
        equipment: ["kurzhanteln"],
        gewichte_kurzhanteln: "10",
        gewichte_kettlebell: "Quatsch",
      }),
    );
    const r = validiereProfil(w);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.profil.gewichte).toEqual({ kurzhanteln: [10] });
  });

  it("meldet Fehler pro Feld", () => {
    const r = validiereProfil(
      parseProfilForm(
        formular({ name: "", equipment: ["kettlebell"], gewichte_kettlebell: "zwölf" }),
      ),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fehler).sort()).toEqual(["gewichte_kettlebell", "name"]);
  });

  it("begrenzt die Namenslänge; ein Profil ohne Equipment (nur Körpergewicht) ist erlaubt", () => {
    expect(validiereProfil({ ...leereProfilFormWerte(), name: "x".repeat(41) }).ok).toBe(false);
    expect(validiereProfil({ ...leereProfilFormWerte(), name: "Nur Körper" }).ok).toBe(true);
  });

  it("Round-Trip über profilZuFormWerte", () => {
    const daten = {
      name: "Zuhause",
      equipment: ["kurzhanteln" as const],
      gewichte: { kurzhanteln: [2, 4, 6, 8] },
      istStandard: false,
    };
    const r = validiereProfil(profilZuFormWerte(daten));
    expect(r.ok && r.profil).toEqual(daten);
  });
});
