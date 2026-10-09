ALTER TABLE `exercise` ADD `ersatz` integer DEFAULT false NOT NULL;--> statement-breakpoint
-- Vorbelegung für bestehende Datenbanken (wie istErsatzStandard): reines Körpergewicht oder nur Band.
UPDATE `exercise` SET `ersatz` = 1 WHERE (`equipment` = '[]' AND `optionale_last` = '[]') OR `equipment` = '[["band"]]';
