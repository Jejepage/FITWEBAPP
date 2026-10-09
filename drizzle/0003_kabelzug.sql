-- Kabelzug wird eine eigene Equipment-Art neben den Maschinen ("maschinen" schloss ihn bisher ein).
-- Profile mit Maschinen behalten alle bisher machbaren Übungen: Sie bekommen den Kabelzug dazu.
UPDATE `equipment_profile` SET `equipment` = replace(`equipment`, '"maschinen"', '"maschinen","kabelzug"') WHERE `equipment` LIKE '%"maschinen"%' AND `equipment` NOT LIKE '%"kabelzug"%';
--> statement-breakpoint
-- Kabelübungen des Startkatalogs, sofern ihre Bedingung noch der alten Vorgabe entspricht.
UPDATE `exercise` SET `equipment` = '[["kabelzug"]]' WHERE `id` IN ('ZH-01', 'ZV-01') AND `equipment` = '[["maschinen"]]';
--> statement-breakpoint
UPDATE `exercise` SET `equipment` = '[["kabelzug","band"]]' WHERE `id` = 'RU-05' AND `equipment` = '[["maschinen","band"]]';
