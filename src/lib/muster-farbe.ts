import type { Muster } from "@/domain/types";

/**
 * Farbklassen je Bewegungsmuster. Die Klassen stehen ausgeschrieben im Quelltext, damit Tailwind
 * sie findet (keine zusammengesetzten Namen). Farbe dient als Fläche, Punkt, Ring und Tönung;
 * Text in Musterfarbe nur mit `ink` (hat in Hell und Dunkel genug Kontrast).
 */
export interface MusterFarbe {
  /** Volle Fläche (Punkt, Balken, Ring) */
  fl: string;
  /** Sanfte Tönung als Hintergrund */
  soft: string;
  /** Text in Musterfarbe, lesbar auf Fläche und Tönung */
  ink: string;
  /** Rahmenfarbe für Hervorhebungen */
  rand: string;
  /** Linienfarbe in SVG */
  stroke: string;
  /** Füllfarbe in SVG */
  fill: string;
  /** Linker Farbstreifen einer Karte */
  streifen: string;
}

export const MUSTER_FARBE: Record<Muster, MusterFarbe> = {
  KN: {
    fl: "bg-m-kn",
    soft: "bg-m-kn-soft",
    ink: "text-m-kn-ink",
    rand: "border-m-kn",
    stroke: "stroke-m-kn",
    fill: "fill-m-kn",
    streifen: "border-l-m-kn",
  },
  HB: {
    fl: "bg-m-hb",
    soft: "bg-m-hb-soft",
    ink: "text-m-hb-ink",
    rand: "border-m-hb",
    stroke: "stroke-m-hb",
    fill: "fill-m-hb",
    streifen: "border-l-m-hb",
  },
  DH: {
    fl: "bg-m-dh",
    soft: "bg-m-dh-soft",
    ink: "text-m-dh-ink",
    rand: "border-m-dh",
    stroke: "stroke-m-dh",
    fill: "fill-m-dh",
    streifen: "border-l-m-dh",
  },
  DV: {
    fl: "bg-m-dv",
    soft: "bg-m-dv-soft",
    ink: "text-m-dv-ink",
    rand: "border-m-dv",
    stroke: "stroke-m-dv",
    fill: "fill-m-dv",
    streifen: "border-l-m-dv",
  },
  ZH: {
    fl: "bg-m-zh",
    soft: "bg-m-zh-soft",
    ink: "text-m-zh-ink",
    rand: "border-m-zh",
    stroke: "stroke-m-zh",
    fill: "fill-m-zh",
    streifen: "border-l-m-zh",
  },
  ZV: {
    fl: "bg-m-zv",
    soft: "bg-m-zv-soft",
    ink: "text-m-zv-ink",
    rand: "border-m-zv",
    stroke: "stroke-m-zv",
    fill: "fill-m-zv",
    streifen: "border-l-m-zv",
  },
  TR: {
    fl: "bg-m-tr",
    soft: "bg-m-tr-soft",
    ink: "text-m-tr-ink",
    rand: "border-m-tr",
    stroke: "stroke-m-tr",
    fill: "fill-m-tr",
    streifen: "border-l-m-tr",
  },
  RU: {
    fl: "bg-m-ru",
    soft: "bg-m-ru-soft",
    ink: "text-m-ru-ink",
    rand: "border-m-ru",
    stroke: "stroke-m-ru",
    fill: "fill-m-ru",
    streifen: "border-l-m-ru",
  },
};

export function musterFarbe(m: Muster): MusterFarbe {
  return MUSTER_FARBE[m];
}
