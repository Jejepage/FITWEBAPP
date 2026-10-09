-- Equipment einer Übung ist jetzt eine einfache Liste (alle Geräte nötig) statt einer Gruppenliste
-- mit ODER innerhalb der Gruppen. Aus jeder Gruppe bleibt das erste Gerät; weitere Varianten sind
-- eigene Übungen im Katalog. Die optionale Last entfällt ebenso (Varianten mit und ohne Gewicht).
UPDATE `exercise` SET `equipment` = (SELECT json_group_array(json_extract(g.`value`, '$[0]')) FROM json_each(`exercise`.`equipment`) AS g) WHERE `equipment` LIKE '[[%';
--> statement-breakpoint
ALTER TABLE `exercise` DROP COLUMN `optionale_last`;
