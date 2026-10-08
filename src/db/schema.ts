import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type {
  Belastungsart,
  Block,
  Einheit,
  EquipmentArt,
  EquipmentBedingung,
  Gewichte,
  Muster,
  Pruefstatus,
  Steigerungsart,
} from "@/domain/types";

const json = <T>(name: string) => text(name, { mode: "json" }).$type<T>();
const bool = (name: string) => integer(name, { mode: "boolean" });
const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

export const exercise = sqliteTable(
  "exercise",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    muster: text("muster").$type<Muster>().notNull(),
    stufe: integer("stufe").notNull(),
    einseitig: bool("einseitig").notNull().default(false),
    equipment: json<EquipmentBedingung>("equipment").notNull(),
    optionaleLast: json<EquipmentArt[]>("optionale_last").notNull(),
    // Bewusst ohne Fremdschlüssel: Nachbarn werden beim Seed in beliebiger Reihenfolge angelegt.
    leichterId: text("leichter_id"),
    schwererId: text("schwerer_id"),
    hauptmuskeln: json<string[]>("hauptmuskeln").notNull(),
    belastungsart: text("belastungsart").$type<Belastungsart>().notNull(),
    standardBereich: text("standard_bereich").notNull(),
    steigerungsart: json<Steigerungsart[]>("steigerungsart").notNull(),
    ausfuehrung: json<string[]>("ausfuehrung").notNull(),
    fehler: json<string[]>("fehler").notNull(),
    hinweise: text("hinweise").notNull(),
    bild: text("bild"),
    videoUrl: text("video_url"),
    aktiv: bool("aktiv").notNull().default(true),
    pruefstatus: text("pruefstatus").$type<Pruefstatus>().notNull().default("zu_pruefen"),
  },
  (t) => [index("exercise_muster_idx").on(t.muster)],
);

export const equipmentProfile = sqliteTable(
  "equipment_profile",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Stabiler Schlüssel der mitgelieferten Profile (studio, zuhause, unterwegs); sonst null. */
    seedKey: text("seed_key"),
    name: text("name").notNull(),
    equipment: json<EquipmentArt[]>("equipment").notNull(),
    gewichte: json<Gewichte>("gewichte").notNull(),
    istStandard: bool("ist_standard").notNull().default(false),
  },
  (t) => [uniqueIndex("equipment_profile_seed_key_idx").on(t.seedKey)],
);

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(), // immer 1
  stufen: json<Record<Muster, number>>("stufen").notNull(),
  einheitenProWoche: integer("einheiten_pro_woche").notNull(),
  zusatzblock: bool("zusatzblock").notNull(),
  aufwaermenText: text("aufwaermen_text").notNull(),
  hinweisAkzeptiertAm: text("hinweis_akzeptiert_am"),
});

export const plan = sqliteTable(
  "plan",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    profilId: integer("profil_id")
      .notNull()
      .references(() => equipmentProfile.id),
    startDatum: text("start_datum").notNull(), // ISO-Datum
    einheitenProWoche: integer("einheiten_pro_woche").notNull(),
    zusatzblock: bool("zusatzblock").notNull(),
    /** Stufen pro Muster zum Zeitpunkt der Erstellung (Grundlage für den Stufen-Check). */
    stufen: json<Record<Muster, number>>("stufen").notNull(),
    status: text("status").$type<"aktiv" | "abgeschlossen">().notNull(),
    vorgaengerId: integer("vorgaenger_id").references((): AnySQLiteColumn => plan.id, {
      onDelete: "set null",
    }),
    erstelltAm: text("erstellt_am").notNull().default(now),
  },
  (t) => [
    // Ein aktiver Plan zur Zeit.
    uniqueIndex("plan_ein_aktiver_idx").on(t.status).where(sql`${t.status} = 'aktiv'`),
  ],
);

export const planSlot = sqliteTable(
  "plan_slot",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    planId: integer("plan_id")
      .notNull()
      .references(() => plan.id, { onDelete: "cascade" }),
    einheit: text("einheit").$type<Einheit>().notNull(),
    block: text("block").$type<Block>().notNull(),
    position: integer("position").notNull(),
    muster: text("muster").$type<Muster>().notNull(),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercise.id),
  },
  (t) => [uniqueIndex("plan_slot_pos_idx").on(t.planId, t.einheit, t.block, t.position)],
);

export const workout = sqliteTable(
  "workout",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    planId: integer("plan_id")
      .notNull()
      .references(() => plan.id, { onDelete: "cascade" }),
    datum: text("datum").notNull(), // ISO-Datum
    einheit: text("einheit").$type<Einheit>().notNull(),
    woche: integer("woche").notNull(),
    profilId: integer("profil_id")
      .notNull()
      .references(() => equipmentProfile.id),
    adHoc: bool("ad_hoc").notNull().default(false),
    /** Zusatzblock in dieser Einheit (überschreibt die Planvorgabe). */
    zusatzblock: bool("zusatzblock").notNull(),
    status: text("status").$type<"laufend" | "abgeschlossen" | "abgebrochen">().notNull(),
    /** Für diese Einheit gewählte Ersatzübungen je Plan-Slot: { "<plan_slot_id>": "<exercise_id>" } */
    ersetzungen: json<Record<string, string>>("ersetzungen").notNull().default({}),
    notiz: text("notiz"),
    gestartetAm: text("gestartet_am").notNull().default(now),
    beendetAm: text("beendet_am"),
  },
  (t) => [index("workout_plan_idx").on(t.planId)],
);

export const setLog = sqliteTable(
  "set_log",
  {
    /** Client-UUID: erneutes Senden desselben Satzes ist idempotent. */
    id: text("id").primaryKey(),
    workoutId: integer("workout_id")
      .notNull()
      .references(() => workout.id, { onDelete: "cascade" }),
    planSlotId: integer("plan_slot_id").references(() => planSlot.id, { onDelete: "set null" }),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercise.id),
    runde: integer("runde").notNull(),
    gewicht: real("gewicht"),
    wdh: integer("wdh"),
    sekunden: integer("sekunden"),
    meter: real("meter"),
    rpe: real("rpe"),
    /** Satz mit 3 s Absenken (Steigerung über Tempo, Spec 2.5) */
    tempo: bool("tempo").notNull().default(false),
    erledigt: bool("erledigt").notNull().default(false),
    erstelltAm: text("erstellt_am").notNull().default(now),
  },
  (t) => [index("set_log_workout_idx").on(t.workoutId), index("set_log_exercise_idx").on(t.exerciseId)],
);
