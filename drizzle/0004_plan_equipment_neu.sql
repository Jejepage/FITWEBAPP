-- Profile werden abgeschafft: Das Equipment gehört jetzt zum Plan (siehe 0005).
-- Bisherige Pläne, Einheiten und Sätze (Testdaten) werden verworfen, damit die folgende Umstellung
-- der Tabellen nichts Halbfertiges zurücklässt. Katalog, Einstellungen und Profile bleiben bis 0005.
DELETE FROM `set_log`;--> statement-breakpoint
DELETE FROM `workout`;--> statement-breakpoint
DELETE FROM `plan_slot`;--> statement-breakpoint
DELETE FROM `plan`;--> statement-breakpoint
ALTER TABLE `plan` ADD `equipment` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `plan` ADD `gewichte` text DEFAULT '{}' NOT NULL;
