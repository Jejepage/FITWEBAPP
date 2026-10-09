import type { EquipmentFormWerte, FormFehler } from "@/domain/equipment-form";

export interface EquipmentState {
  fehler?: FormFehler;
  werte?: EquipmentFormWerte;
}
