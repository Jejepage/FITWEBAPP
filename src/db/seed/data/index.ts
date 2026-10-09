import { istErsatzStandard } from "@/domain/equipment";
import type { ExerciseSeed, ExerciseSeedRoh } from "@/domain/types";
import { kn } from "./kn";
import { hb } from "./hb";
import { dh } from "./dh";
import { dv } from "./dv";
import { zh } from "./zh";
import { zv } from "./zv";
import { tr } from "./tr";
import { ru } from "./ru";

const roh: ExerciseSeedRoh[] = [...kn, ...hb, ...dh, ...dv, ...zh, ...zv, ...tr, ...ru];

/** Der Katalog; das Ersatz-Kennzeichen folgt der Regel in `istErsatzStandard`. */
export const uebungenSeed: ExerciseSeed[] = roh.map((u) => ({ ...u, ersatz: istErsatzStandard(u) }));
