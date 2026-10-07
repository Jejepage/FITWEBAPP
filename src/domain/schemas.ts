import { z } from "zod";
import {
  BELASTUNGSARTEN,
  EQUIPMENT_ARTEN,
  MUSTER,
  PRUEFSTATI,
  STEIGERUNGSARTEN,
} from "./types";

export const musterSchema = z.enum(MUSTER);
export const equipmentArtSchema = z.enum(EQUIPMENT_ARTEN);
export const equipmentBedingungSchema = z.array(z.array(equipmentArtSchema).min(1));

/** "8–12", "20–40 s" oder "20–40 m" (Gedankenstrich oder Bindestrich) */
export const STANDARD_BEREICH_RE = /^\d+\s?[–-]\s?\d+( s| m)?$/;

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
  hauptmuskeln: z.array(z.string().min(1)).min(1),
  belastungsart: z.enum(BELASTUNGSARTEN),
  standardBereich: z.string().regex(STANDARD_BEREICH_RE),
  steigerungsart: z.array(z.enum(STEIGERUNGSARTEN)).min(1),
  ausfuehrung: z.array(z.string().min(1)).min(3).max(5),
  fehler: z.array(z.string().min(1)).min(2).max(4),
  hinweise: z.string().min(1),
  bild: z.string().nullable(),
  aktiv: z.boolean(),
  pruefstatus: z.enum(PRUEFSTATI),
});

export const exerciseSeedSchema = exerciseSchema.omit({
  bild: true,
  aktiv: true,
  pruefstatus: true,
});
