import { Checkbox, Feld, Gruppe } from "@/components/form-felder";
import { eingabe, hilfstext } from "@/components/ui";
import { GEWICHT_ARTEN, gewichteFeld, type FormFehler } from "@/domain/equipment-form";
import type { GewichtArt } from "@/domain/equipment-form";
import { EQUIPMENT_AUSWAHL, EQUIPMENT_NAMEN, type EquipmentArt } from "@/domain/types";

/**
 * Häkchen für das verfügbare Equipment und Felder für die Hantelgewichte. Gemeinsam für das Formular
 * eines neuen Plans und für die spätere Änderung des Equipments; ohne Hooks, damit es in Server-
 * und Client-Komponenten funktioniert.
 */
export function EquipmentFelder({
  equipment,
  gewichteText,
  fehler = {},
  texte,
}: {
  equipment: readonly EquipmentArt[];
  gewichteText: Record<GewichtArt, string>;
  fehler?: FormFehler;
  texte: {
    equipment: string;
    equipmentHilfe: string;
    gewichte: (art: string) => string;
    gewichteHilfe: string;
  };
}) {
  return (
    <>
      <Gruppe legende={texte.equipment} hilfe={texte.equipmentHilfe}>
        <div className="grid sm:grid-cols-2">
          {EQUIPMENT_AUSWAHL.map((art) => (
            <Checkbox
              key={art}
              name="equipment"
              value={art}
              label={EQUIPMENT_NAMEN[art]}
              checked={equipment.includes(art)}
            />
          ))}
        </div>
      </Gruppe>

      <div className="grid gap-x-3 sm:grid-cols-2">
        {GEWICHT_ARTEN.map((art) => (
          <Feld
            key={art}
            label={texte.gewichte(EQUIPMENT_NAMEN[art])}
            fehler={fehler[gewichteFeld(art)]}
            klasse="mb-4"
          >
            <input
              name={gewichteFeld(art)}
              defaultValue={gewichteText[art]}
              inputMode="text"
              placeholder={art === "kurzhanteln" ? "2–20/2" : "12, 16"}
              className={eingabe}
            />
          </Feld>
        ))}
      </div>
      <p className={`${hilfstext} mb-6 px-1`}>{texte.gewichteHilfe}</p>
    </>
  );
}
