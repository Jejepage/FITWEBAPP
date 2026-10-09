import { exerciseSchema } from "./schemas";
import { parseVideoEingabe } from "./youtube";
import {
  EQUIPMENT_AUSWAHL,
  type Belastungsart,
  type EquipmentArt,
  type EquipmentBedingung,
  type Exercise,
  type Muster,
  type Pruefstatus,
  type Steigerungsart,
} from "./types";

/** Zahl der Gruppen-Zeilen im Equipment-Editor (ohne JavaScript). */
export const GRUPPEN_ANZAHL = 3;

/** Alles, was das Formular einer Übung bearbeiten kann (ohne ID, Muster, Bild). */
export interface ExerciseFormWerte {
  name: string;
  stufe: number;
  einseitig: boolean;
  equipment: EquipmentBedingung;
  optionaleLast: EquipmentArt[];
  belastungsart: Belastungsart;
  standardBereich: string;
  steigerungsart: Steigerungsart[];
  hauptmuskeln: string[];
  ausfuehrung: string[];
  fehler: string[];
  hinweise: string;
  /** Eingegebener YouTube-Link (leer = kein Link); beim Speichern in die Standardform gebracht. */
  videoUrl: string;
  aktiv: boolean;
  ersatz: boolean;
  pruefstatus: Pruefstatus;
  leichterId: string | null;
  schwererId: string | null;
}

export type FormFehler = Record<string, string>;

const FELD_FEHLER: Record<string, string> = {
  name: "Bitte einen Namen angeben.",
  stufe: "Stufe zwischen 1 und 5 wählen.",
  equipment: "Ungültige Equipment-Angabe.",
  optionaleLast: "Ungültige Angabe zur optionalen Last.",
  belastungsart: "Bitte eine Belastungsart wählen.",
  standardBereich:
    'Format "8–12", "20–40 s" oder "20–40 m", erste Zahl höchstens so groß wie die zweite.',
  steigerungsart: "Mindestens eine Steigerungsart wählen.",
  hauptmuskeln: "1 bis 4 Muskeln angeben, je Zeile einer.",
  ausfuehrung: "3 bis 5 Schritte angeben, je Zeile einer.",
  fehler: "2 bis 4 typische Fehler angeben, je Zeile einer.",
  hinweise: "Bitte einen Hinweis angeben.",
  videoUrl:
    "Bitte einen YouTube-Link zu einem einzelnen Video angeben (youtube.com oder youtu.be, keine Playlist oder Kanal) oder das Feld leeren.",
  pruefstatus: "Ungültiger Prüfstatus.",
};

const text = (v: FormDataEntryValue | null): string => (typeof v === "string" ? v.trim() : "");
const zeilen = (v: FormDataEntryValue | null): string[] =>
  text(v)
    .split(/\r?\n/)
    .map((z) => z.trim())
    .filter(Boolean);
const eintraege = (fd: FormData, key: string): string[] =>
  fd.getAll(key).filter((v): v is string => typeof v === "string");
const arten = (werte: string[]): EquipmentArt[] =>
  [...new Set(werte)].filter((w): w is EquipmentArt =>
    (EQUIPMENT_AUSWAHL as readonly string[]).includes(w),
  );

/** Liest ein Formular tolerant aus; Prüfung übernimmt `validiereExercise`. */
export function parseExerciseForm(fd: FormData): ExerciseFormWerte {
  const equipment: EquipmentBedingung = [];
  for (let i = 0; i < GRUPPEN_ANZAHL; i++) {
    const gruppe = arten(eintraege(fd, `gruppe${i}`));
    if (gruppe.length > 0) equipment.push(gruppe);
  }
  return {
    name: text(fd.get("name")),
    stufe: text(fd.get("stufe")) === "" ? Number.NaN : Number(text(fd.get("stufe"))),
    einseitig: fd.get("einseitig") === "on",
    equipment,
    optionaleLast: arten(eintraege(fd, "optionaleLast")),
    belastungsart: text(fd.get("belastungsart")) as Belastungsart,
    standardBereich: text(fd.get("standardBereich")),
    steigerungsart: eintraege(fd, "steigerungsart") as Steigerungsart[],
    hauptmuskeln: zeilen(fd.get("hauptmuskeln")),
    ausfuehrung: zeilen(fd.get("ausfuehrung")),
    fehler: zeilen(fd.get("fehler")),
    hinweise: text(fd.get("hinweise")),
    videoUrl: text(fd.get("videoUrl")),
    aktiv: fd.get("aktiv") === "on",
    ersatz: fd.get("ersatz") === "on",
    pruefstatus: text(fd.get("pruefstatus")) as Pruefstatus,
    leichterId: text(fd.get("leichterId")) || null,
    schwererId: text(fd.get("schwererId")) || null,
  };
}

export type ValidierungsErgebnis =
  | { ok: true; exercise: Exercise }
  | { ok: false; fehler: FormFehler };

/** Prüft Formularwerte mit dem Übungs-Schema; Fehler sind pro Feld in deutscher Sprache. */
export function validiereExercise(
  werte: ExerciseFormWerte,
  fest: { id: string; muster: Muster; bild: string | null },
): ValidierungsErgebnis {
  const video = parseVideoEingabe(werte.videoUrl);
  if (!video.ok) {
    // Weitere Fehler trotzdem mit melden, damit das Formular alles auf einmal anzeigt.
    const rest = exerciseSchema.safeParse({ ...werte, ...fest, videoUrl: null });
    const fehler: FormFehler = { videoUrl: FELD_FEHLER.videoUrl as string };
    if (!rest.success) {
      for (const issue of rest.error.issues) {
        const feld = String(issue.path[0] ?? "_form");
        fehler[feld] ??= FELD_FEHLER[feld] ?? "Ungültige Eingabe.";
      }
    }
    return { ok: false, fehler };
  }
  const kandidat = { ...werte, ...fest, videoUrl: video.url };
  const r = exerciseSchema.safeParse(kandidat);
  if (!r.success) {
    const fehler: FormFehler = {};
    for (const issue of r.error.issues) {
      const feld = String(issue.path[0] ?? "_form");
      fehler[feld] ??= FELD_FEHLER[feld] ?? "Ungültige Eingabe.";
    }
    return { ok: false, fehler };
  }
  return { ok: true, exercise: r.data as Exercise };
}

/** Umgekehrt: bestehende Übung → Formularwerte (zum Vorbelegen). */
export function exerciseZuFormWerte(e: Exercise): ExerciseFormWerte {
  return {
    name: e.name,
    stufe: e.stufe,
    einseitig: e.einseitig,
    equipment: e.equipment,
    optionaleLast: e.optionaleLast,
    belastungsart: e.belastungsart,
    standardBereich: e.standardBereich,
    steigerungsart: e.steigerungsart,
    hauptmuskeln: e.hauptmuskeln,
    ausfuehrung: e.ausfuehrung,
    fehler: e.fehler,
    hinweise: e.hinweise,
    videoUrl: e.videoUrl ?? "",
    aktiv: e.aktiv,
    ersatz: e.ersatz,
    pruefstatus: e.pruefstatus,
    leichterId: e.leichterId,
    schwererId: e.schwererId,
  };
}

/** Leere Vorlage für "Neue Übung". */
export function leereFormWerte(): ExerciseFormWerte {
  return {
    name: "",
    stufe: 2,
    einseitig: false,
    equipment: [],
    optionaleLast: [],
    belastungsart: "wdh",
    standardBereich: "8–12",
    steigerungsart: ["wdh", "gewicht"],
    hauptmuskeln: [],
    ausfuehrung: [],
    fehler: [],
    hinweise: "",
    videoUrl: "",
    aktiv: true,
    ersatz: false,
    pruefstatus: "zu_pruefen",
    leichterId: null,
    schwererId: null,
  };
}
