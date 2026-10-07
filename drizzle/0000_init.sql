CREATE TABLE `equipment_profile` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seed_key` text,
	`name` text NOT NULL,
	`equipment` text NOT NULL,
	`gewichte` text NOT NULL,
	`ist_standard` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `equipment_profile_seed_key_idx` ON `equipment_profile` (`seed_key`);--> statement-breakpoint
CREATE TABLE `exercise` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`muster` text NOT NULL,
	`stufe` integer NOT NULL,
	`einseitig` integer DEFAULT false NOT NULL,
	`equipment` text NOT NULL,
	`optionale_last` text NOT NULL,
	`leichter_id` text,
	`schwerer_id` text,
	`hauptmuskeln` text NOT NULL,
	`belastungsart` text NOT NULL,
	`standard_bereich` text NOT NULL,
	`steigerungsart` text NOT NULL,
	`ausfuehrung` text NOT NULL,
	`fehler` text NOT NULL,
	`hinweise` text NOT NULL,
	`bild` text,
	`aktiv` integer DEFAULT true NOT NULL,
	`pruefstatus` text DEFAULT 'zu_pruefen' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `exercise_muster_idx` ON `exercise` (`muster`);--> statement-breakpoint
CREATE TABLE `plan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profil_id` integer NOT NULL,
	`start_datum` text NOT NULL,
	`einheiten_pro_woche` integer NOT NULL,
	`zusatzblock` integer NOT NULL,
	`stufen` text NOT NULL,
	`status` text NOT NULL,
	`vorgaenger_id` integer,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`profil_id`) REFERENCES `equipment_profile`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plan_ein_aktiver_idx` ON `plan` (`status`) WHERE "plan"."status" = 'aktiv';--> statement-breakpoint
CREATE TABLE `plan_slot` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL,
	`einheit` text NOT NULL,
	`block` text NOT NULL,
	`position` integer NOT NULL,
	`muster` text NOT NULL,
	`exercise_id` text NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plan`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plan_slot_pos_idx` ON `plan_slot` (`plan_id`,`einheit`,`block`,`position`);--> statement-breakpoint
CREATE TABLE `set_log` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` integer NOT NULL,
	`plan_slot_id` integer,
	`exercise_id` text NOT NULL,
	`runde` integer NOT NULL,
	`gewicht` real,
	`wdh` integer,
	`sekunden` integer,
	`meter` real,
	`rpe` real,
	`erledigt` integer DEFAULT false NOT NULL,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`workout_id`) REFERENCES `workout`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plan_slot_id`) REFERENCES `plan_slot`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `set_log_workout_idx` ON `set_log` (`workout_id`);--> statement-breakpoint
CREATE INDEX `set_log_exercise_idx` ON `set_log` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`stufen` text NOT NULL,
	`einheiten_pro_woche` integer NOT NULL,
	`zusatzblock` integer NOT NULL,
	`aufwaermen_text` text NOT NULL,
	`hinweis_akzeptiert_am` text
);
--> statement-breakpoint
CREATE TABLE `workout` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL,
	`datum` text NOT NULL,
	`einheit` text NOT NULL,
	`woche` integer NOT NULL,
	`profil_id` integer NOT NULL,
	`ad_hoc` integer DEFAULT false NOT NULL,
	`zusatzblock` integer NOT NULL,
	`status` text NOT NULL,
	`notiz` text,
	`gestartet_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`beendet_am` text,
	FOREIGN KEY (`plan_id`) REFERENCES `plan`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`profil_id`) REFERENCES `equipment_profile`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workout_plan_idx` ON `workout` (`plan_id`);