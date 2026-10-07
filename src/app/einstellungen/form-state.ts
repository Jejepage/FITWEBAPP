import type { ProfilFormWerte } from "@/domain/profile-form";
import type { SettingsFormWerte } from "@/domain/settings-form";

export type Fehler = Record<string, string>;

export interface SettingsState {
  fehler?: Fehler;
  werte?: SettingsFormWerte;
  gespeichert?: boolean;
}

export interface ProfilState {
  fehler?: Fehler;
  werte?: ProfilFormWerte;
}

export interface LoeschState {
  fehler?: string;
}
