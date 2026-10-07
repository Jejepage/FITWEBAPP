import type { ExerciseSeed } from "@/domain/types";
import { kn } from "./kn";
import { hb } from "./hb";
import { dh } from "./dh";
import { dv } from "./dv";
import { zh } from "./zh";
import { zv } from "./zv";
import { tr } from "./tr";
import { ru } from "./ru";

export const uebungenSeed: ExerciseSeed[] = [...kn, ...hb, ...dh, ...dv, ...zh, ...zv, ...tr, ...ru];
