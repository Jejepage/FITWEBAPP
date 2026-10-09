import { z } from "zod";
import { parseBereich } from "./bereich";
import { istStandardYoutubeUrl } from "./youtube";
import { BELASTUNGSARTEN, EQUIPMENT_ARTEN, MUSTER, PRUEFSTATI, STEIGERUNGSARTEN } from "./types";

export const musterSchema = z.enum(MUSTER);
export const equipmentArtSchema = z.enum(EQUIPMENT_ARTEN);
// "keins" gehört nicht in eine Bedingung: Körpergewicht wird durch [] ausgedrückt.
const bedingungsArtSchema = equipmentArtSchema.exclude(["keins"]);
export const equipmentBedingungSchema = z.array(z.array(bedingungsArtSchema).min(1));

export const exerciseSchema = z.object({
  id: z.string().regex(/^(KN|HB|DH|DV|ZH|ZV|TR|RU)-\d{2}$/),
  name: z.string().min(1),
  muster: musterSchema,
  stufe: z.number().int().min(1).max(5),
  einseitig: z.boolean(),
  equipment: equipmentBedingungSchema,
  optionaleLast: z.array(equipmentArtSchema),
  leichterId: z.string().nullable(),
  schwererId: z.string().nullable(),
  hauptmuskeln: z.array(z.string().min(1)).min(1).max(4),
  belastungsart: z.enum(BELASTUNGSARTEN),
  standardBereich: z
    .string()
    .refine((v) => parseBereich(v) !== null, "Format 8–12, 20–40 s oder 20–40 m, min ≤ max"),
  steigerungsart: z.array(z.enum(STEIGERUNGSARTEN)).min(1),
  ausfuehrung: z.array(z.string().min(1)).min(3).max(5),
  fehler: z.array(z.string().min(1)).min(2).max(4),
  hinweise: z.string().min(1),
  bild: z.string().nullable(),
  videoUrl: z
    .string()
    .refine(istStandardYoutubeUrl, "Standardform eines YouTube-Links")
    .nullable(),
  aktiv: z.boolean(),
  pruefstatus: z.enum(PRUEFSTATI),
  ersatz: z.boolean(),
});

export const exerciseSeedSchema = exerciseSchema.omit({
  bild: true,
  videoUrl: true,
  aktiv: true,
  pruefstatus: true,
});
