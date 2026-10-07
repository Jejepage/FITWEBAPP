// Serialisierbare Daten zwischen Server (Seite) und Trainingsbildschirm (Client Component).
import type { Bereich } from "@/domain/bereich";
import type { Schritt } from "@/domain/ablauf";
import type { SatzWerte, Vorschlag } from "@/domain/training-types";
import type { Belastungsart, Einheit, Muster, Steigerungsart } from "@/domain/types";

export interface UebungInfo {
  id: string;
  name: string;
  muster: Muster;
  einseitig: boolean;
  belastungsart: Belastungsart;
  steigerungsart: Steigerungsart[];
  ausfuehrung: string[];
  fehler: string[];
  hinweise: string;
  ziel: Bereich;
  /** Zielvorgabe als Text, z. B. "8–12 Wdh pro Seite" */
  zielText: string;
  vorschlag: Vorschlag;
  /** Name der nächsten Stufe, wenn eine Steigerung dorthin vorgeschlagen wird */
  schwererName: string | null;
  /** Sätze der letzten Einheit mit dieser Übung (Anzeige "Letztes Mal") */
  letzte: { saetze: SatzWerte[]; datum: string } | null;
}

export interface KandidatInfo {
  id: string;
  name: string;
  stufe: number;
  einseitig: boolean;
}

export interface GespeicherterSatzInfo {
  id: string;
  /** Schritt-Schlüssel "<slotId>:<runde>" */
  key: string;
  exerciseId: string;
  werte: SatzWerte;
}

export interface TrainingsDaten {
  workoutId: number;
  einheit: Einheit;
  woche: number;
  zusatzblock: boolean;
  /** z. B. "3 × 10–12 Wdh · RPE 7" */
  vorgabeText: string;
  rpeMin: number;
  rpeMax: number;
  aufwaermenText: string;
  schritte: Schritt[];
  /** Alle Übungen der Einheit (geplant, ersetzt, bereits protokolliert) */
  uebungen: Record<string, UebungInfo>;
  /** Mögliche Ersatzübungen je Plan-Slot */
  ersatzKandidaten: Record<number, KandidatInfo[]>;
  gespeichert: GespeicherterSatzInfo[];
  /** Ersatzübungen je Slot (Text-Schlüssel wie in der Datenbank) */
  ersetzungen: Record<string, string>;
}
