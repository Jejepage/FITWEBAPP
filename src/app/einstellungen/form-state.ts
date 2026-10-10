import type { SettingsFormWerte } from "@/domain/settings-form";

export type Fehler = Record<string, string>;

export interface SettingsState {
  fehler?: Fehler;
  werte?: SettingsFormWerte;
  gespeichert?: boolean;
}
