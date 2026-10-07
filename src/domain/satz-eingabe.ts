import { z } from "zod";

const zahl = (min: number, max: number) => z.number().finite().min(min).max(max);
const ganz = (min: number, max: number) => z.number().int().min(min).max(max);

/** Ein erledigter Satz, wie ihn der Trainingsbildschirm an den Server schickt. */
export const satzEingabeSchema = z
  .object({
    /** Client-UUID: gleiches Senden überschreibt denselben Satz, nie doppelt */
    id: z.string().regex(/^[A-Za-z0-9-]{8,64}$/),
    workoutId: ganz(1, 2_000_000_000),
    planSlotId: ganz(1, 2_000_000_000),
    exerciseId: z.string().regex(/^(KN|HB|DH|DV|ZH|ZV|TR|RU)-\d{2,3}$/),
    runde: ganz(1, 6),
    gewicht: zahl(0, 1000).nullable(),
    wdh: ganz(0, 500).nullable(),
    sekunden: ganz(0, 7200).nullable(),
    meter: zahl(0, 20000).nullable(),
    /** RPE 1 bis 10 in halben Schritten */
    rpe: zahl(1, 10)
      .refine((v) => Number.isInteger(v * 2), "RPE in halben Schritten")
      .nullable(),
    tempo: z.boolean(),
  })
  .refine((s) => s.wdh !== null || s.sekunden !== null || s.meter !== null, {
    message: "Wiederholungen, Sekunden oder Meter fehlen",
    path: ["wdh"],
  })
  .transform((s) => ({
    ...s,
    gewicht: s.gewicht === null ? null : Math.round(s.gewicht * 100) / 100,
    meter: s.meter === null ? null : Math.round(s.meter * 100) / 100,
  }));

export type SatzEingabe = z.output<typeof satzEingabeSchema>;
