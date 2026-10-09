PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_plan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`equipment` text NOT NULL,
	`gewichte` text NOT NULL,
	`start_datum` text NOT NULL,
	`einheiten_pro_woche` integer NOT NULL,
	`zusatzblock` integer NOT NULL,
	`stufen` text NOT NULL,
	`status` text NOT NULL,
	`vorgaenger_id` integer,
	`erstellt_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`vorgaenger_id`) REFERENCES `plan`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_plan`("id", "equipment", "gewichte", "start_datum", "einheiten_pro_woche", "zusatzblock", "stufen", "status", "vorgaenger_id", "erstellt_am") SELECT "id", "equipment", "gewichte", "start_datum", "einheiten_pro_woche", "zusatzblock", "stufen", "status", "vorgaenger_id", "erstellt_am" FROM `plan`;--> statement-breakpoint
DROP TABLE `plan`;--> statement-breakpoint
ALTER TABLE `__new_plan` RENAME TO `plan`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `plan_ein_aktiver_idx` ON `plan` (`status`) WHERE "plan"."status" = 'aktiv';--> statement-breakpoint
CREATE TABLE `__new_workout` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL,
	`datum` text NOT NULL,
	`einheit` text NOT NULL,
	`woche` integer NOT NULL,
	`zusatzblock` integer NOT NULL,
	`status` text NOT NULL,
	`ersetzungen` text DEFAULT '{}' NOT NULL,
	`notiz` text,
	`gestartet_am` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`beendet_am` text,
	FOREIGN KEY (`plan_id`) REFERENCES `plan`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_workout`("id", "plan_id", "datum", "einheit", "woche", "zusatzblock", "status", "ersetzungen", "notiz", "gestartet_am", "beendet_am") SELECT "id", "plan_id", "datum", "einheit", "woche", "zusatzblock", "status", "ersetzungen", "notiz", "gestartet_am", "beendet_am" FROM `workout`;--> statement-breakpoint
DROP TABLE `workout`;--> statement-breakpoint
ALTER TABLE `__new_workout` RENAME TO `workout`;--> statement-breakpoint
CREATE INDEX `workout_plan_idx` ON `workout` (`plan_id`);--> statement-breakpoint
-- Zuletzt, weil plan und workout bis hierher noch auf die Tabelle verweisen.
DROP TABLE `equipment_profile`;
