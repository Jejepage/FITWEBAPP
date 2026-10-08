// Prüfung von Backup-Dateien (Spec F8): Kopf, Schema der Zeilen, Integrität der Verweise.
// Rein: liest nur das übergebene Objekt, kennt weder Datenbank noch React. Der Datenbankzugriff
// steht in src/server/backup.ts, die Typen in backup-types.ts.
import { z } from "zod";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type AllesDaten,
  type BackupArt,
  type BackupDatei,
  type KatalogDaten,
  type ParseBackupFn,
  type ParseErgebnis,
  type PlanSlotZeile,
  type PlanZeile,
  type ProfilZeile,
} from "./backup-types";
import { MAX_ANZAHL_GEWICHTE, MAX_GEWICHT_KG } from "./gewichte";
import { slotKey, slotVorlageVonKey } from "./plan-types";
import { equipmentArtSchema, exerciseSchema, musterSchema } from "./schemas";
import { MAX_AUFWAERMEN_ZEICHEN } from "./settings-form";
import { MUSTER, type Exercise, type Muster } from "./types";

/** Obergrenzen der Zeilenzahlen je Tabelle (Schutz vor absurd großen Dateien). */
export const BACKUP_ZEILEN_LIMIT = {
  uebungen: 500,
  profile: 50,
  plaene: 200,
  slotsJePlan: 16,
  planSlots: 200 * 16,
  einheiten: 5000,
  saetze: 200_000,
} as const;

/** Längste Notiz einer Einheit in Zeichen */
export const BACKUP_MAX_NOTIZ_ZEICHEN = 2000;
/** So viele Meldungen liefert parseBackup höchstens; der Rest wird als Zahl zusammengefasst. */
export const BACKUP_MAX_MELDUNGEN = 10;

const MAX_ID = 2_000_000_000;

// ---------------------------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------------------------

const idSchema = z.number().int().min(1).max(MAX_ID);
const datumSchema = z.iso.date();
const zeitstempelSchema = z.iso.datetime({ offset: true });
const stufeSchema = z.number().int().min(1).max(5);
const stufenSchema = z.object(
  Object.fromEntries(MUSTER.map((m) => [m, stufeSchema])) as Record<Muster, typeof stufeSchema>,
);
const einheitenProWocheSchema = z
  .number()
  .int()
  .refine((n) => n === 2 || n === 3, "muss 2 oder 3 sein");
const nichtLeerSchema = z.string().refine((s) => s.trim() !== "", "darf nicht leer sein");

const gewichteSchema = z.partialRecord(
  equipmentArtSchema,
  z.array(z.number().gt(0).max(MAX_GEWICHT_KG)).max(MAX_ANZAHL_GEWICHTE),
);

export const profilZeileSchema = z.object({
  id: idSchema,
  seedKey: z.string().min(1).nullable(),
  name: nichtLeerSchema,
  equipment: z.array(equipmentArtSchema),
  gewichte: gewichteSchema,
  istStandard: z.boolean(),
});

export const einstellungenZeileSchema = z.object({
  stufen: stufenSchema,
  einheitenProWoche: einheitenProWocheSchema,
  zusatzblock: z.boolean(),
  aufwaermenText: z.string().min(1).max(MAX_AUFWAERMEN_ZEICHEN),
  hinweisAkzeptiertAm: zeitstempelSchema.nullable(),
});

export const planZeileSchema = z.object({
  id: idSchema,
  profilId: idSchema,
  startDatum: datumSchema,
  einheitenProWoche: einheitenProWocheSchema,
  zusatzblock: z.boolean(),
  stufen: stufenSchema,
  status: z.enum(["aktiv", "abgeschlossen"]),
  vorgaengerId: idSchema.nullable(),
  erstelltAm: zeitstempelSchema,
});

export const planSlotZeileSchema = z.object({
  id: idSchema,
  planId: idSchema,
  einheit: z.enum(["A", "B"]),
  block: z.enum(["1", "2", "Z"]),
  position: z.number().int().min(1).max(3),
  muster: musterSchema,
  exerciseId: z.string().min(1),
});

const SLOT_ID_RE = /^[1-9]\d*$/;

export const einheitZeileSchema = z.object({
  id: idSchema,
  planId: idSchema,
  datum: datumSchema,
  einheit: z.enum(["A", "B"]),
  woche: z.number().int().min(1).max(6),
  profilId: idSchema,
  adHoc: z.boolean(),
  zusatzblock: z.boolean(),
  status: z.enum(["laufend", "abgeschlossen", "abgebrochen"]),
  ersetzungen: z
    .record(z.string(), z.string().min(1))
    .refine(
      (r) => Object.keys(r).every((k) => SLOT_ID_RE.test(k)),
      "hat Schlüssel, die keine Plan-Slot-IDs (positive ganze Zahlen) sind",
    ),
  notiz: z.string().max(BACKUP_MAX_NOTIZ_ZEICHEN).nullable(),
  gestartetAm: zeitstempelSchema,
  beendetAm: zeitstempelSchema.nullable(),
});

export const satzZeileSchema = z
  .object({
    id: z
      .string()
      .refine(
        (s) => /^[A-Za-z0-9-]{8,64}$/.test(s),
        "ist keine gültige Satz-ID (8 bis 64 Zeichen: Buchstaben, Ziffern, Bindestrich)",
      ),
    workoutId: idSchema,
    planSlotId: idSchema.nullable(),
    exerciseId: z.string().min(1),
    runde: z.number().int().min(1).max(6),
    gewicht: z.number().min(0).max(1000).nullable(),
    wdh: z.number().int().min(0).max(500).nullable(),
    sekunden: z.number().int().min(0).max(7200).nullable(),
    meter: z.number().min(0).max(20000).nullable(),
    rpe: z
      .number()
      .min(1)
      .max(10)
      .refine((v) => Number.isInteger(v * 2), "muss in halben Schritten angegeben werden")
      .nullable(),
    tempo: z.boolean(),
    erledigt: z.boolean(),
    erstelltAm: zeitstempelSchema,
  })
  .refine((s) => s.wdh !== null || s.sekunden !== null || s.meter !== null, {
    message: "Wiederholungen, Sekunden oder Meter fehlen (mindestens ein Messwert nötig)",
  });

export const katalogDatenSchema = z.object({
  uebungen: z.array(exerciseSchema).max(BACKUP_ZEILEN_LIMIT.uebungen),
});

export const allesDatenSchema = katalogDatenSchema.extend({
  profile: z.array(profilZeileSchema).max(BACKUP_ZEILEN_LIMIT.profile),
  einstellungen: einstellungenZeileSchema,
  plaene: z.array(planZeileSchema).max(BACKUP_ZEILEN_LIMIT.plaene),
  planSlots: z.array(planSlotZeileSchema).max(BACKUP_ZEILEN_LIMIT.planSlots),
  einheiten: z.array(einheitZeileSchema).max(BACKUP_ZEILEN_LIMIT.einheiten),
  saetze: z.array(satzZeileSchema).max(BACKUP_ZEILEN_LIMIT.saetze),
});

/** Kopf einer Backup-Datei; `daten` wird je nach Art getrennt geprüft. */
export const backupKopfSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(BACKUP_VERSION),
  art: z.enum(["alles", "katalog"]),
  erstelltAm: zeitstempelSchema,
});

/** Vollständige Datei einer Art (Kopf und Daten, ohne Integritätsprüfung). */
export const backupDateiSchema = z.discriminatedUnion("art", [
  backupKopfSchema.extend({ art: z.literal("katalog"), daten: katalogDatenSchema }),
  backupKopfSchema.extend({ art: z.literal("alles"), daten: allesDatenSchema }),
]);

// ---------------------------------------------------------------------------------------------
// Meldungen
// ---------------------------------------------------------------------------------------------

/** Sammelt Fehlermeldungen: speichert die ersten zehn, zählt alle. */
class Meldungen {
  private liste: string[] = [];
  private gesamt = 0;

  add(text: string): void {
    this.gesamt++;
    if (this.liste.length < BACKUP_MAX_MELDUNGEN) this.liste.push(text);
  }

  get anzahl(): number {
    return this.gesamt;
  }

  ergebnis(): string[] {
    const rest = this.gesamt - this.liste.length;
    if (rest <= 0) return [...this.liste];
    return [...this.liste, rest === 1 ? "… und 1 weiterer Fehler" : `… und ${rest} weitere Fehler`];
  }
}

const TABELLEN = {
  uebungen: { plural: "Übungen", einzahl: "Übung" },
  profile: { plural: "Profile", einzahl: "Profil" },
  plaene: { plural: "Pläne", einzahl: "Plan" },
  planSlots: { plural: "Plan-Slots", einzahl: "Plan-Slot" },
  einheiten: { plural: "Einheiten", einzahl: "Einheit" },
  saetze: { plural: "Sätze", einzahl: "Satz" },
} as const;

type TabellenName = keyof typeof TABELLEN;

const ART_NAMEN: Record<BackupArt, string> = { alles: "Gesamt-Backup", katalog: "Katalog-Backup" };

const istObjekt = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const zahlText = (n: number) => String(n).replace(".", ",");

/** Kurze, lesbare Darstellung eines unbekannten Werts für Meldungen */
function anzeige(wert: unknown): string {
  if (typeof wert === "string") return wert.length > 30 ? `${wert.slice(0, 30)}…` : wert;
  if (typeof wert === "number" || typeof wert === "boolean") return String(wert);
  return wert === null ? "null" : "(ungültig)";
}

const ERWARTET_TEXT: Record<string, string> = {
  string: "Text",
  number: "eine Zahl",
  int: "eine ganze Zahl",
  boolean: "Wahr oder Falsch (true/false)",
  array: "eine Liste",
  object: "ein Objekt",
  record: "ein Objekt",
};

/** Holt den Wert an einem Zod-Pfad aus den Rohdaten (undefined, wenn es ihn nicht gibt). */
function wertAmPfad(wurzel: unknown, pfad: readonly PropertyKey[]): unknown {
  let aktuell = wurzel;
  for (const schritt of pfad) {
    if (typeof aktuell !== "object" || aktuell === null) return undefined;
    aktuell = (aktuell as Record<PropertyKey, unknown>)[schritt];
  }
  return aktuell;
}

/** Deutscher Satzteil zu einem Zod-Befund, passend nach „Feld x“ (oder nach „Plan 3:“). */
function issueText(issue: z.core.$ZodIssue, wert: unknown): string {
  switch (issue.code) {
    case "invalid_type":
      if (wert === undefined) return "fehlt";
      return `muss ${ERWARTET_TEXT[issue.expected] ?? issue.expected} sein`;
    case "too_small": {
      const min = zahlText(Number(issue.minimum));
      if (issue.origin === "string")
        return min === "1" ? "darf nicht leer sein" : `muss mindestens ${min} Zeichen lang sein`;
      if (issue.origin === "array")
        return min === "1" ? "darf nicht leer sein" : `muss mindestens ${min} Einträge haben`;
      return issue.inclusive ? `muss mindestens ${min} sein` : `muss größer als ${min} sein`;
    }
    case "too_big": {
      const max = zahlText(Number(issue.maximum));
      if (issue.origin === "string") return `darf höchstens ${max} Zeichen lang sein`;
      if (issue.origin === "array") return `darf höchstens ${max} Einträge haben`;
      return issue.inclusive ? `darf höchstens ${max} sein` : `muss kleiner als ${max} sein`;
    }
    case "invalid_value":
      return `muss einer der Werte ${issue.values.map((v) => `„${String(v)}“`).join(", ")} sein`;
    case "invalid_format":
      if (issue.format === "date") return "ist kein gültiges Datum (erwartet JJJJ-MM-TT)";
      if (issue.format === "datetime")
        return "ist kein gültiger ISO-Zeitstempel (z. B. 2026-01-31T12:00:00Z)";
      return "hat ein ungültiges Format";
    case "unrecognized_keys":
      return `enthält unbekannte Schlüssel: ${issue.keys.join(", ")}`;
    case "custom":
      // Eigene Meldungen sind Satzteile in Kleinschreibung; fremde (z. B. aus exerciseSchema)
      // beginnen groß und werden mit Doppelpunkt angehängt.
      return /^[a-zäöü]/.test(issue.message) ? issue.message : `: ${issue.message}`;
    default:
      return issue.message;
  }
}

/** „ausfuehrung (Eintrag 2)“ aus dem Restpfad einer Zeile; Listenindizes zählen ab 1. */
function feldPfad(pfad: readonly PropertyKey[]): string {
  let text = "";
  for (const schritt of pfad) {
    if (typeof schritt === "number") text += ` (Eintrag ${schritt + 1})`;
    else text += `${text === "" ? "" : "."}${String(schritt)}`;
  }
  return text;
}

/** „Feld x muss …“; fremde Meldungen (mit Doppelpunkt) werden als „Feld x: …“ angehängt. */
const feldSatz = (feld: string, text: string) =>
  `Feld ${feld}${text.startsWith(":") ? "" : " "}${text}`;

/** Eine Zod-Meldung mit Fundstelle: „Übung KN-02: Feld ausfuehrung muss mindestens 3 …“ */
function issueMeldung(issue: z.core.$ZodIssue, daten: unknown): string {
  const text = issueText(issue, wertAmPfad(daten, issue.path));
  const [tabelle, index, ...rest] = issue.path;

  if (tabelle === "einstellungen") {
    const feld = feldPfad(issue.path.slice(1));
    return feld === "" ? `Einstellungen ${text}` : `Einstellungen: ${feldSatz(feld, text)}`;
  }
  if (typeof tabelle !== "string" || !(tabelle in TABELLEN)) {
    return `Daten: ${feldSatz(feldPfad(issue.path), text)}`;
  }
  const namen = TABELLEN[tabelle as TabellenName];
  if (index === undefined) return `${namen.plural}: ${text}`;

  const zeile = typeof index === "number" ? wertAmPfad(daten, [tabelle, index]) : undefined;
  const id = istObjekt(zeile) ? zeile.id : undefined;
  const marke =
    typeof id === "string" || typeof id === "number"
      ? String(id)
      : `Nr. ${typeof index === "number" ? index + 1 : "?"}`;
  const label = `${namen.einzahl} ${marke}`;
  const feld = feldPfad(rest);
  if (feld === "") return `${label}: ${text.replace(/^: /, "")}`;
  return `${label}: ${feldSatz(feld, text)}`;
}

// ---------------------------------------------------------------------------------------------
// Integrität
// ---------------------------------------------------------------------------------------------

/** Indexiert Zeilen nach Schlüssel und meldet doppelte Schlüssel (die erste Zeile gewinnt). */
function indexiere<T, K>(
  zeilen: readonly T[],
  schluessel: (zeile: T) => K,
  beschreibung: (zeile: T) => string,
  m: Meldungen,
  was = "Die ID",
): Map<K, T> {
  const karte = new Map<K, T>();
  for (const zeile of zeilen) {
    const k = schluessel(zeile);
    if (karte.has(k)) m.add(`${beschreibung(zeile)}: ${was} kommt mehrfach vor.`);
    else karte.set(k, zeile);
  }
  return karte;
}

function pruefeKatalog(daten: KatalogDaten, m: Meldungen): Map<string, Exercise> {
  const nachId = indexiere(
    daten.uebungen,
    (u) => u.id,
    (u) => `Übung ${u.id}`,
    m,
  );
  for (const u of daten.uebungen) {
    const nachbarn = [
      ["leichterId", u.leichterId],
      ["schwererId", u.schwererId],
    ] as const;
    for (const [feld, ziel] of nachbarn) {
      if (ziel === null) continue;
      const nachbar = nachId.get(ziel);
      if (ziel === u.id) m.add(`Übung ${u.id}: Feld ${feld} verweist auf die Übung selbst.`);
      else if (!nachbar)
        m.add(`Übung ${u.id}: Feld ${feld} verweist auf ${ziel}, die nicht existiert.`);
      else if (nachbar.muster !== u.muster) {
        m.add(
          `Übung ${u.id}: Feld ${feld} verweist auf ${ziel} aus dem Muster ${nachbar.muster}, ` +
            `erwartet wurde ${u.muster}.`,
        );
      }
    }
  }
  return nachId;
}

function pruefeProfile(profile: readonly ProfilZeile[], m: Meldungen): Map<number, ProfilZeile> {
  const nachId = indexiere(
    profile,
    (p) => p.id,
    (p) => `Profil ${p.id}`,
    m,
  );
  const seedKeys = new Set<string>();
  for (const p of profile) {
    if (p.seedKey === null) continue;
    if (seedKeys.has(p.seedKey))
      m.add(`Profil ${p.id}: seedKey „${p.seedKey}“ kommt mehrfach vor.`);
    else seedKeys.add(p.seedKey);
  }
  const standard = profile.filter((p) => p.istStandard);
  if (profile.length > 0 && standard.length === 0) {
    m.add("Profile: Kein Profil ist als Standard markiert.");
  } else if (standard.length > 1) {
    m.add(
      `Profile: Mehrere Profile sind als Standard markiert (${standard.map((p) => p.id).join(", ")}).`,
    );
  }
  return nachId;
}

function pruefePlaene(
  plaene: readonly PlanZeile[],
  profile: ReadonlyMap<number, ProfilZeile>,
  m: Meldungen,
): Map<number, PlanZeile> {
  const nachId = indexiere(
    plaene,
    (p) => p.id,
    (p) => `Plan ${p.id}`,
    m,
  );
  for (const p of plaene) {
    if (!profile.has(p.profilId)) m.add(`Plan ${p.id}: Profil ${p.profilId} existiert nicht.`);
    if (p.vorgaengerId === p.id) m.add(`Plan ${p.id}: Der Plan ist sein eigener Vorgänger.`);
    else if (p.vorgaengerId !== null && !nachId.has(p.vorgaengerId)) {
      m.add(`Plan ${p.id}: Vorgänger ${p.vorgaengerId} existiert nicht.`);
    }
  }
  const aktiv = plaene.filter((p) => p.status === "aktiv");
  if (aktiv.length > 1) {
    m.add(
      `Pläne: Mehrere Pläne sind aktiv (${aktiv.map((p) => p.id).join(", ")}), erlaubt ist einer.`,
    );
  }
  return nachId;
}

function pruefeSlots(
  slots: readonly PlanSlotZeile[],
  plaene: ReadonlyMap<number, PlanZeile>,
  uebungen: ReadonlyMap<string, { muster: Muster }>,
  m: Meldungen,
): Map<number, PlanSlotZeile> {
  const nachId = indexiere(
    slots,
    (s) => s.id,
    (s) => `Plan-Slot ${s.id}`,
    m,
  );
  const positionen = new Set<string>();
  for (const s of slots) {
    const name = `Plan-Slot ${s.id}`;
    if (!plaene.has(s.planId)) m.add(`${name}: Plan ${s.planId} existiert nicht.`);
    const uebung = uebungen.get(s.exerciseId);
    if (!uebung) m.add(`${name}: Übung ${s.exerciseId} existiert nicht.`);
    else if (uebung.muster !== s.muster) {
      m.add(
        `${name}: Muster ${s.muster} passt nicht zur Übung ${s.exerciseId} (Muster ${uebung.muster}).`,
      );
    }

    const key = slotKey(s);
    const vorlage = slotVorlageVonKey(key);
    if (!vorlage) m.add(`${name}: Die Position ${key} gibt es in keinem Plan.`);
    else if (vorlage.muster !== s.muster) {
      m.add(
        `${name}: Muster ${s.muster} passt nicht zur Position ${key} (Muster ${vorlage.muster}).`,
      );
    }

    const eindeutig = `${s.planId}|${key}`;
    if (positionen.has(eindeutig)) {
      m.add(`${name}: Die Position ${key} ist in Plan ${s.planId} mehrfach belegt.`);
    } else positionen.add(eindeutig);
  }
  return nachId;
}

function pruefeAlles(daten: AllesDaten, m: Meldungen): void {
  const uebungen = pruefeKatalog(daten, m);
  const profile = pruefeProfile(daten.profile, m);
  const plaene = pruefePlaene(daten.plaene, profile, m);
  const slots = pruefeSlots(daten.planSlots, plaene, uebungen, m);

  const einheiten = indexiere(
    daten.einheiten,
    (e) => e.id,
    (e) => `Einheit ${e.id}`,
    m,
  );
  for (const e of daten.einheiten) {
    const name = `Einheit ${e.id}`;
    if (!plaene.has(e.planId)) m.add(`${name}: Plan ${e.planId} existiert nicht.`);
    if (!profile.has(e.profilId)) m.add(`${name}: Profil ${e.profilId} existiert nicht.`);
    for (const [schluessel, uebungId] of Object.entries(e.ersetzungen)) {
      const slot = slots.get(Number(schluessel));
      if (!slot || slot.planId !== e.planId) {
        m.add(`${name}: Die Ersetzung für Slot ${schluessel} gehört nicht zu Plan ${e.planId}.`);
      }
      if (!uebungen.has(uebungId)) {
        m.add(
          `${name}: Die Ersetzung für Slot ${schluessel} nennt Übung ${uebungId}, die nicht existiert.`,
        );
      }
    }
  }
  const laufend = daten.einheiten.filter((e) => e.status === "laufend");
  if (laufend.length > 1) {
    m.add(
      `Einheiten: Mehrere Einheiten laufen (${laufend.map((e) => e.id).join(", ")}), erlaubt ist eine.`,
    );
  }

  indexiere(
    daten.saetze,
    (s) => s.id,
    (s) => `Satz ${s.id}`,
    m,
    "Die ID",
  );
  const schritte = new Set<string>();
  for (const s of daten.saetze) {
    const name = `Satz ${s.id}`;
    const einheit = einheiten.get(s.workoutId);
    if (!einheit) m.add(`${name}: Einheit ${s.workoutId} existiert nicht.`);
    if (!uebungen.has(s.exerciseId)) m.add(`${name}: Übung ${s.exerciseId} existiert nicht.`);
    if (s.planSlotId === null) continue;

    const slot = slots.get(s.planSlotId);
    if (!slot) m.add(`${name}: Plan-Slot ${s.planSlotId} existiert nicht.`);
    else if (einheit && slot.planId !== einheit.planId) {
      m.add(
        `${name}: Plan-Slot ${slot.id} gehört zu Plan ${slot.planId}, die Einheit ${einheit.id} ` +
          `aber zu Plan ${einheit.planId}.`,
      );
    }
    const schritt = `${s.workoutId}|${s.planSlotId}|${s.runde}`;
    if (schritte.has(schritt)) {
      m.add(
        `${name}: Für Einheit ${s.workoutId}, Plan-Slot ${s.planSlotId} und Runde ${s.runde} ` +
          "gibt es mehrere Sätze.",
      );
    } else schritte.add(schritt);
  }
}

// ---------------------------------------------------------------------------------------------
// Einstieg
// ---------------------------------------------------------------------------------------------

const fehlschlag = (fehler: string[]): ParseErgebnis => ({ ok: false, fehler });

function pruefeKopf(roh: Record<string, unknown>, erwartet?: BackupArt): string[] {
  const fehler: string[] = [];
  if (roh.format !== BACKUP_FORMAT) {
    fehler.push(`Die Datei ist kein FIT-Backup (Feld format ist nicht „${BACKUP_FORMAT}“).`);
  }
  if (roh.version === undefined) fehler.push("Die Backup-Version fehlt.");
  else if (roh.version !== BACKUP_VERSION) {
    fehler.push(
      `Backup-Version ${anzeige(roh.version)} wird nicht unterstützt ` +
        `(diese App liest Version ${BACKUP_VERSION}).`,
    );
  }
  const art = roh.art;
  if (art !== "alles" && art !== "katalog") {
    fehler.push(`Unbekannte Backup-Art ${anzeige(art)} (erlaubt: „alles“ oder „katalog“).`);
  } else if (erwartet !== undefined && art !== erwartet) {
    fehler.push(
      `Die Datei enthält ein ${ART_NAMEN[art]}, erwartet wurde ein ${ART_NAMEN[erwartet]}.`,
    );
  }
  if (!zeitstempelSchema.safeParse(roh.erstelltAm).success) {
    fehler.push("Das Feld erstelltAm ist kein gültiger ISO-Zeitstempel.");
  }
  return fehler;
}

const TABELLEN_LIMITS: Record<BackupArt, readonly (readonly [string, string, number])[]> = {
  katalog: [["uebungen", "Übungen", BACKUP_ZEILEN_LIMIT.uebungen]],
  alles: [
    ["uebungen", "Übungen", BACKUP_ZEILEN_LIMIT.uebungen],
    ["profile", "Profile", BACKUP_ZEILEN_LIMIT.profile],
    ["plaene", "Pläne", BACKUP_ZEILEN_LIMIT.plaene],
    ["planSlots", "Plan-Slots", BACKUP_ZEILEN_LIMIT.planSlots],
    ["einheiten", "Einheiten", BACKUP_ZEILEN_LIMIT.einheiten],
    ["saetze", "Sätze", BACKUP_ZEILEN_LIMIT.saetze],
  ],
};

function pruefeZeilenzahlen(daten: Record<string, unknown>, art: BackupArt): string[] {
  const fehler: string[] = [];
  for (const [feld, name, max] of TABELLEN_LIMITS[art]) {
    const liste = daten[feld];
    if (Array.isArray(liste) && liste.length > max) {
      fehler.push(`${name}: ${liste.length} Zeilen sind zu viel (höchstens ${max}).`);
    }
  }
  return fehler;
}

function parseIntern(roh: unknown, erwartet?: BackupArt): ParseErgebnis {
  if (!istObjekt(roh)) {
    return fehlschlag(["Die Datei ist kein gültiges Backup (erwartet wird ein JSON-Objekt)."]);
  }
  const kopfFehler = pruefeKopf(roh, erwartet);
  if (kopfFehler.length > 0) return fehlschlag(kopfFehler);
  if (!istObjekt(roh.daten)) return fehlschlag(["Das Feld daten fehlt oder ist kein Objekt."]);

  const art = roh.art as BackupArt;
  // Zeilenzahlen vor der Schemaprüfung begrenzen: Zod sammelt sonst für jede Zeile alle Fehler,
  // und eine kleine Datei mit sehr vielen kaputten Zeilen würde Speicher und Zeit sprengen.
  const zuViele = pruefeZeilenzahlen(roh.daten, art);
  if (zuViele.length > 0) return fehlschlag(zuViele);
  const schema = art === "alles" ? allesDatenSchema : katalogDatenSchema;
  const geprueft = schema.safeParse(roh.daten);
  const m = new Meldungen();
  if (!geprueft.success) {
    for (const issue of geprueft.error.issues) m.add(issueMeldung(issue, roh.daten));
    return fehlschlag(m.ergebnis());
  }

  const kopf = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    erstelltAm: roh.erstelltAm as string,
  } as const;
  let datei: BackupDatei;
  if (art === "alles") {
    const daten = geprueft.data as AllesDaten;
    pruefeAlles(daten, m);
    datei = { ...kopf, art, daten };
  } else {
    const daten = geprueft.data as KatalogDaten;
    pruefeKatalog(daten, m);
    datei = { ...kopf, art, daten };
  }
  return m.anzahl > 0 ? fehlschlag(m.ergebnis()) : { ok: true, datei };
}

/**
 * Prüft eine eingelesene Backup-Datei (beliebiges JSON). Prüft erst den Kopf, dann das Schema
 * der Zeilen und erst danach die Verweise zwischen den Tabellen. Wirft nie; liefert höchstens
 * zehn Meldungen (plus eine Zusammenfassung). Unbekannte Zusatzfelder werden still verworfen.
 */
export const parseBackup: ParseBackupFn = (roh, erwartet) => {
  try {
    return parseIntern(roh, erwartet);
  } catch {
    return fehlschlag(["Die Datei konnte nicht gelesen werden."]);
  }
};
