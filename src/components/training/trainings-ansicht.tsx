"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  beendeTrainingAktion,
  brecheTrainingAbAktion,
  ersetzeUebungAktion,
  speichereSatzAktion,
} from "@/app/training/actions";
import { naechsterOffenerIndex, schrittKey, type Schritt } from "@/domain/ablauf";
import { formatSatz } from "@/domain/satz-format";
import { vorbelegung, type FormularWerte } from "@/domain/satz-vorbelegung";
import type { Block } from "@/domain/types";
import { de } from "@/i18n/de";
import { vorschlagGrundText } from "@/i18n/vorschlag-text";
import { liesJson, loesche, schreibeJson } from "@/lib/speicher";
import { aktualisiereSeitenCache } from "@/lib/sw";
import { neueUuid } from "@/lib/uuid";
import { FehlerBanner } from "@/components/form-felder";
import { IconBlitz, IconHaken } from "@/components/icons";
import { VideoKnopf } from "@/components/katalog/video-knopf";
import { bannerWarn, eingabe, gruppe, knopfNeutral } from "@/components/ui";
import { MUSTER_FARBE } from "@/lib/muster-farbe";
import { aktionsZeile, Aufklapp, Angeheftet, hauptKnopf, InfoKarte, MusterChip } from "./bausteine";
import { FortschrittsRing } from "./fortschritt-ring";
import { useGrosserBildschirm, useWakeLock } from "./hooks";
import {
  IconAbbrechen,
  IconBlock,
  IconBuch,
  IconMehr,
  IconPokal,
  IconSonne,
  IconTausch,
  IconUhr,
  IconZiel,
  IconZurueck,
} from "./icons-training";
import { SatzFormular } from "./satz-formular";
import type { GespeicherterSatzInfo, TrainingsDaten, UebungInfo } from "./typen";

const t = de.training;
const BLOCK_NAME: Record<Block, string> = {
  "1": t.block1,
  "2": t.block2,
  Z: t.blockZ,
};

type Status = "ok" | "wartet" | "abgelehnt";
type Gespeichert = GespeicherterSatzInfo & { status: Status };

type Phase =
  | { art: "aufwaermen" }
  | { art: "satz" }
  | { art: "block"; naechster: Block }
  | { art: "fertig" };

/** Was an den Server geschickt wird (entspricht satzEingabeSchema). */
interface Payload {
  id: string;
  workoutId: number;
  planSlotId: number;
  exerciseId: string;
  runde: number;
  gewicht: number | null;
  wdh: number | null;
  sekunden: number | null;
  meter: number | null;
  rpe: number | null;
  tempo: boolean;
}

const wartendSchluessel = (workoutId: number) => `fit-wartend-${workoutId}`;

function datumTagMonat(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}

/** Rahmen des Trainingsbildschirms: schmale Mitte; der Satzbildschirm ab 1024 px mit Seitenfeld. */
function Rahmen({
  satz = false,
  breit = false,
  children,
}: {
  satz?: boolean;
  breit?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-xl ${satz ? "lg:max-w-[60rem]" : ""} ${breit ? "lg:max-w-4xl" : ""}`}
    >
      {children}
    </div>
  );
}

export function TrainingsAnsicht({ daten }: { daten: TrainingsDaten }) {
  const router = useRouter();
  const { schritte } = daten;
  const { verfuegbar: wakeLockVerfuegbar } = useWakeLock(true);
  const grossBildschirm = useGrosserBildschirm();

  const [gespeichert, setGespeichert] = useState<Record<string, Gespeichert>>(() =>
    Object.fromEntries(daten.gespeichert.map((g) => [g.key, { ...g, status: "ok" as const }])),
  );
  const [uebungen, setUebungen] = useState<Record<string, UebungInfo>>(daten.uebungen);
  const [ersetzungen, setErsetzungen] = useState<Record<string, string>>(daten.ersetzungen);
  const [phase, setPhase] = useState<Phase>(() =>
    daten.gespeichert.length === 0 ? { art: "aufwaermen" } : { art: "satz" },
  );
  const [bearbeiteKey, setBearbeiteKey] = useState<string | null>(null);
  const phaseVorKorrektur = useRef<Phase | null>(null);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [notiz, setNotiz] = useState("");
  const [beendet, setBeendet] = useState(false);

  // --- Speichern mit automatischer Wiederholung -------------------------------------------
  const wartend = useRef(new Map<string, Payload>());
  const unterwegs = useRef(new Set<string>());

  const persistiere = useCallback(() => {
    if (wartend.current.size === 0) loesche(wartendSchluessel(daten.workoutId));
    else schreibeJson(wartendSchluessel(daten.workoutId), [...wartend.current.values()]);
  }, [daten.workoutId]);

  const setzeStatus = useCallback((id: string, status: Status) => {
    setGespeichert((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([k, v]) => [k, v.id === id ? { ...v, status } : v]),
      ),
    );
  }, []);

  const entferneSatz = useCallback((id: string) => {
    setGespeichert((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([, v]) => v.id !== id)),
    );
  }, []);

  const verwirfWartende = () => {
    const ids = new Set(wartend.current.keys());
    wartend.current.clear();
    persistiere();
    setGespeichert((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([, v]) => !ids.has(v.id))),
    );
    setMeldung(null);
  };

  const sende = useCallback(
    async (start: Payload) => {
      // Der neueste Stand je Satz-ID liegt in `wartend`; nach einer laufenden Sendung wird mit
      // diesem Stand weitergesendet, damit eine Korrektur nie verloren geht.
      wartend.current.set(start.id, start);
      persistiere();
      if (unterwegs.current.has(start.id)) return;
      unterwegs.current.add(start.id);
      try {
        let p: Payload | undefined = start;
        while (p) {
          const gesendet: Payload = p;
          try {
            const r = await speichereSatzAktion(gesendet);
            const neuer = wartend.current.get(gesendet.id);
            if (neuer !== gesendet) {
              p = neuer; // inzwischen korrigiert: den neuen Stand senden
              continue;
            }
            wartend.current.delete(gesendet.id);
            persistiere();
            if (r.ok) {
              setzeStatus(gesendet.id, "ok");
              aktualisiereSeitenCache(`/training/${daten.workoutId}`);
            } else {
              // Abgelehnte Sätze zählen nicht als erledigt: Der Schritt wird wieder offen.
              entferneSatz(gesendet.id);
              setMeldung(t.speichern.fehlgeschlagen(r.code));
            }
          } catch {
            // Netz weg: Satz bleibt lokal erhalten und wird später erneut gesendet.
            setzeStatus(gesendet.id, "wartet");
          }
          p = undefined;
        }
      } finally {
        unterwegs.current.delete(start.id);
      }
    },
    [persistiere, setzeStatus, entferneSatz, daten.workoutId],
  );

  const wiederhole = useCallback(() => {
    for (const p of wartend.current.values()) void sende(p);
  }, [sende]);

  // Beim Laden: nicht gespeicherte Sätze aus einer früheren Sitzung wiederherstellen und senden.
  useEffect(() => {
    const gemerkt = liesJson<Payload[]>(wartendSchluessel(daten.workoutId), []);
    if (gemerkt.length === 0) return;
    for (const p of gemerkt) wartend.current.set(p.id, p);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- einmaliges Laden aus localStorage
    setGespeichert((prev) => {
      const next = { ...prev };
      for (const p of gemerkt) {
        const key = schrittKey(p.planSlotId, p.runde);
        next[key] = {
          id: p.id,
          key,
          exerciseId: p.exerciseId,
          werte: {
            gewicht: p.gewicht,
            wdh: p.wdh,
            sekunden: p.sekunden,
            meter: p.meter,
            rpe: p.rpe,
            tempo: p.tempo,
          },
          status: "wartet",
        };
      }
      return next;
    });
    wiederhole();
  }, [daten.workoutId, wiederhole]);

  useEffect(() => {
    const takt = window.setInterval(wiederhole, 5000);
    window.addEventListener("online", wiederhole);
    return () => {
      window.clearInterval(takt);
      window.removeEventListener("online", wiederhole);
    };
  }, [wiederhole]);

  // --- Abgeleiteter Zustand ---------------------------------------------------------------
  const erledigteKeys = useMemo(() => new Set(Object.keys(gespeichert)), [gespeichert]);
  const offenerIndex = naechsterOffenerIndex(schritte, erledigteKeys);
  const schritt: Schritt | null = bearbeiteKey
    ? (schritte.find((s) => s.key === bearbeiteKey) ?? null)
    : offenerIndex >= 0
      ? (schritte[offenerIndex] ?? null)
      : null;
  const wartendAnzahl = Object.values(gespeichert).filter((g) => g.status === "wartet").length;

  const wirksameId = (s: Schritt): string =>
    (bearbeiteKey === s.key ? gespeichert[s.key]?.exerciseId : undefined) ??
    ersetzungen[String(s.slotId)] ??
    s.geplanteUebungId;

  // Alles erledigt: Abschlussbildschirm, auch ohne dass ein Übergang ausgelöst wurde.
  const effektivePhase: Phase =
    phase.art === "satz" && schritt === null ? { art: "fertig" } : phase;

  // --- Aktionen ---------------------------------------------------------------------------
  const onErledigt = (werte: FormularWerte) => {
    if (!schritt) return;
    const id = (bearbeiteKey ? gespeichert[bearbeiteKey]?.id : undefined) ?? neueUuid();
    const exerciseId = wirksameId(schritt);
    const payload: Payload = {
      id,
      workoutId: daten.workoutId,
      planSlotId: schritt.slotId,
      exerciseId,
      runde: schritt.runde,
      ...werte,
    };
    setGespeichert((prev) => ({
      ...prev,
      [schritt.key]: {
        id,
        key: schritt.key,
        exerciseId,
        werte,
        status: "wartet",
      },
    }));
    setMeldung(null);
    void sende(payload);

    if (bearbeiteKey) {
      setBearbeiteKey(null);
      setPhase(phaseVorKorrektur.current ?? { art: "satz" });
      phaseVorKorrektur.current = null;
      return;
    }
    if (schritt.danach === "block") {
      const idx = schritte.findIndex((s) => s.key === schritt.key);
      const naechster = schritte[idx + 1]?.block;
      setPhase(naechster ? { art: "block", naechster } : { art: "fertig" });
    } else if (schritt.danach === "ende") setPhase({ art: "fertig" });
  };

  const ersetze = async (kandidatId: string) => {
    if (!schritt) return;
    const r = await ersetzeUebungAktion(daten.workoutId, schritt.slotId, kandidatId);
    if (!r.ok) {
      setMeldung(t.ersetzenFehler);
      return;
    }
    setUebungen((prev) => ({ ...prev, [r.info.id]: r.info }));
    setErsetzungen((prev) => {
      const next = { ...prev };
      if (kandidatId === schritt.geplanteUebungId) delete next[String(schritt.slotId)];
      else next[String(schritt.slotId)] = kandidatId;
      return next;
    });
    setMeldung(null);
  };

  const vorigenAendern = () => {
    const gespeicherteSchritte = schritte.filter((s) => gespeichert[s.key]);
    const letzter = gespeicherteSchritte[gespeicherteSchritte.length - 1];
    if (!letzter) return;
    phaseVorKorrektur.current = phase.art === "block" ? phase : null;
    setBearbeiteKey(letzter.key);
    setPhase({ art: "satz" });
  };

  const abschliessen = async () => {
    const r = await beendeTrainingAktion(daten.workoutId, notiz);
    if (r.ok) {
      setBeendet(true);
      router.push(`/verlauf/einheit/${daten.workoutId}?neu=1`);
      router.refresh();
    } else setMeldung(t.fehler[r.code]);
  };

  const abbrechen = async () => {
    if (!window.confirm(t.mehr.abbrechenFrage)) return;
    const r = await brecheTrainingAbAktion(daten.workoutId);
    if (r.ok) {
      setBeendet(true);
      router.push("/");
      router.refresh();
    } else setMeldung(t.fehler[r.code]);
  };

  const vorzeitig = () => {
    const offen = schritte.length - erledigteKeys.size;
    if (offen > 0 && !window.confirm(t.mehr.vorzeitigFrage(offen))) return;
    setPhase({ art: "fertig" });
  };

  // --- Darstellung ------------------------------------------------------------------------
  const kopf = (strichKlasse?: string) => (
    <header className="mb-5 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold">
          {t.kopf(daten.einheit, daten.woche)}
          {daten.adHoc && (
            <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-semibold text-warn-ink">
              {de.adhoc.kopfBadge(daten.profilName)}
            </span>
          )}
        </p>
        <p className="mt-0.5 text-sm text-ink-3">
          {t.fortschritt(erledigteKeys.size, schritte.length)}
        </p>
      </div>
      <FortschrittsRing
        erledigt={erledigteKeys.size}
        gesamt={schritte.length}
        beschriftung={t.fortschritt(erledigteKeys.size, schritte.length)}
        strichKlasse={strichKlasse}
      />
    </header>
  );

  const hinweise = (
    <>
      {!wakeLockVerfuegbar && (
        <p className="mb-3 rounded-2xl bg-fill-2 p-4 text-sm text-ink-2">
          {t.bildschirm.kannNicht}
        </p>
      )}
      {wartendAnzahl > 0 && (
        <p role="status" className={`${bannerWarn} mb-3 text-sm`}>
          {t.speichern.wartet(wartendAnzahl)}{" "}
          <button
            type="button"
            onClick={verwirfWartende}
            className="min-h-11 font-semibold text-warn-ink underline"
          >
            {t.speichern.verwerfen}
          </button>
        </p>
      )}
      {meldung && <FehlerBanner>{meldung}</FehlerBanner>}
    </>
  );

  const mehr = (
    <Aufklapp titel={t.mehr.titel} symbol={<IconMehr className="size-6" />} klasse="mt-6">
      <div className="divide-y divide-line">
        {erledigteKeys.size > 0 && effektivePhase.art !== "fertig" && (
          <button type="button" onClick={vorigenAendern} className={`${aktionsZeile} text-ink`}>
            <IconZurueck className="size-5 text-ink-3" />
            {t.mehr.vorigenAendern}
          </button>
        )}
        {effektivePhase.art !== "fertig" && erledigteKeys.size > 0 && (
          <button type="button" onClick={vorzeitig} className={`${aktionsZeile} text-ink`}>
            <IconHaken className="size-5 text-ink-3" />
            {t.mehr.vorzeitigAbschliessen}
          </button>
        )}
        <button type="button" onClick={abbrechen} className={`${aktionsZeile} text-bad-ink`}>
          <IconAbbrechen className="size-5" />
          {t.mehr.abbrechen}
        </button>
      </div>
    </Aufklapp>
  );

  if (beendet) return <p role="status">…</p>;

  // Aufwärmen
  if (effektivePhase.art === "aufwaermen") {
    return (
      <Rahmen>
        {kopf()}
        {hinweise}
        <section
          aria-labelledby="aufwaermen-titel"
          className="rounded-[1.75rem] bg-surface p-6 shadow-card sm:p-8"
        >
          <div className="mb-5 flex items-center gap-4">
            <span
              aria-hidden="true"
              className="grid size-14 shrink-0 place-items-center rounded-2xl bg-warn-soft text-warn-ink"
            >
              <IconSonne className="size-8" />
            </span>
            <h1 id="aufwaermen-titel" className="text-4xl font-bold tracking-tight">
              {t.aufwaermenTitel}
            </h1>
          </div>
          <p className="whitespace-pre-line text-lg leading-relaxed">{daten.aufwaermenText}</p>
          <p className="mt-5 text-sm text-ink-3">{t.aufwaermenHilfe}</p>
        </section>
        <Angeheftet>
          <button type="button" onClick={() => setPhase({ art: "satz" })} className={hauptKnopf}>
            {t.aufwaermenErledigt}
          </button>
        </Angeheftet>
        {mehr}
      </Rahmen>
    );
  }

  // Blockwechsel
  if (effektivePhase.art === "block") {
    const imBlock = schritte.filter((s) => s.block === effektivePhase.naechster && s.runde === 1);
    const fertigerBlock = offenerIndex > 0 ? schritte[offenerIndex - 1]?.block : undefined;
    return (
      <Rahmen>
        {kopf()}
        {hinweise}
        <section>
          <div className="mb-6 text-center">
            <span
              aria-hidden="true"
              className="mx-auto mb-4 grid size-20 place-items-center rounded-full bg-ok-soft text-ok-ink"
            >
              <IconBlock className="size-10" />
            </span>
            <h1 className="text-4xl font-bold tracking-tight">
              {t.block.geschafft(BLOCK_NAME[fertigerBlock ?? "1"])}
            </h1>
            <p className="mt-2 text-lg text-ink-3">
              {t.block.naechster}: {BLOCK_NAME[effektivePhase.naechster]}
            </p>
          </div>
          <ol className={gruppe}>
            {imBlock.map((s, i) => {
              const f = MUSTER_FARBE[s.muster];
              return (
                <li key={s.key} className="flex min-h-16 items-center gap-4 px-4 py-3">
                  <span
                    aria-hidden="true"
                    className={`grid size-9 shrink-0 place-items-center rounded-full ${f.soft} text-base font-bold ${f.ink}`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-lg font-semibold leading-snug">
                    {uebungen[wirksameId(s)]?.name ?? wirksameId(s)}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
        <Angeheftet>
          <button type="button" onClick={() => setPhase({ art: "satz" })} className={hauptKnopf}>
            {t.block.weiter}
          </button>
        </Angeheftet>
        {mehr}
      </Rahmen>
    );
  }

  // Abschluss
  if (effektivePhase.art === "fertig") {
    const nachUebung = new Map<string, Gespeichert[]>();
    for (const s of schritte) {
      const g = gespeichert[s.key];
      if (g) nachUebung.set(g.exerciseId, [...(nachUebung.get(g.exerciseId) ?? []), g]);
    }
    return (
      <Rahmen breit>
        {kopf()}
        {hinweise}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
          <div>
            <div className="mb-6 flex items-center gap-4">
              <span
                aria-hidden="true"
                className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-hero-from to-hero-to text-on-accent shadow-lg"
              >
                <IconPokal className="size-8" />
              </span>
              <div className="min-w-0">
                <h1 className="text-4xl font-bold tracking-tight">{t.fertig.titel}</h1>
                <p className="mt-1 text-base text-ink-3">{t.fertig.hilfe}</p>
              </div>
            </div>
            {nachUebung.size === 0 ? (
              <FehlerBanner>{t.fertig.keineSaetze}</FehlerBanner>
            ) : (
              <ul className={`${gruppe} mb-6 lg:mb-0`}>
                {[...nachUebung.entries()].map(([id, saetze]) => {
                  const u = uebungen[id];
                  return (
                    <li key={id} className="px-4 py-3.5">
                      <p className="flex items-center gap-2.5 text-lg font-semibold leading-snug">
                        {u && (
                          <span
                            aria-hidden="true"
                            className={`size-2.5 shrink-0 rounded-full ${MUSTER_FARBE[u.muster].fl}`}
                          />
                        )}
                        {u?.name ?? id}
                      </p>
                      <ol className="mt-2 space-y-1.5">
                        {saetze.map((g, i) => (
                          <li key={g.id} className="flex items-center gap-3 text-[15px] text-ink-2">
                            <span
                              aria-hidden="true"
                              className="grid size-6 shrink-0 place-items-center rounded-full bg-fill-2 text-xs font-semibold text-ink"
                            >
                              {i + 1}
                            </span>
                            {formatSatz(g.werte)}
                          </li>
                        ))}
                      </ol>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="lg:sticky lg:top-6">
            <label className="mb-1 block rounded-card bg-surface p-4 shadow-card">
              <span className="mb-2 block text-sm font-medium text-ink-3">{t.fertig.notiz}</span>
              <textarea
                value={notiz}
                onChange={(e) => setNotiz(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder={t.fertig.notizPlatzhalter}
                className={eingabe}
              />
            </label>
            <Angeheftet>
              <button
                type="button"
                onClick={abschliessen}
                disabled={wartendAnzahl > 0 || nachUebung.size === 0}
                className={hauptKnopf}
              >
                {wartendAnzahl > 0 ? t.fertig.warteSpeichern : t.fertig.abschliessen}
              </button>
              {offenerIndex >= 0 && (
                <button
                  type="button"
                  onClick={() => setPhase({ art: "satz" })}
                  className={`${knopfNeutral} mt-3 w-full`}
                >
                  {t.fertig.zurueck}
                </button>
              )}
            </Angeheftet>
          </div>
        </div>
        {mehr}
      </Rahmen>
    );
  }

  // Der Satz braucht einen aktuellen Schritt
  if (!schritt) return null;
  const exerciseId = wirksameId(schritt);
  const info = uebungen[exerciseId];
  if (!info) return <FehlerBanner>{t.ersetzenFehler}</FehlerBanner>;
  const ersetzt = exerciseId !== schritt.geplanteUebungId;
  const farbe = MUSTER_FARBE[info.muster];

  // Satz
  const vorige = gespeichert[schrittKey(schritt.slotId, schritt.runde - 1)];
  const vorigeWerte = vorige && vorige.exerciseId === exerciseId ? vorige.werte : null;
  const korrektur = bearbeiteKey === schritt.key;
  const startWerte: FormularWerte =
    korrektur && gespeichert[schritt.key]
      ? gespeichert[schritt.key]!.werte
      : vorbelegung(info, vorigeWerte, daten.rpeMax);
  const kandidaten = (daten.ersatzKandidaten[schritt.slotId] ?? []).filter(
    (k) => k.id !== exerciseId,
  );
  const vorschlagText = vorschlagGrundText(info.vorschlag.grund, info.schwererName);

  return (
    <Rahmen satz>
      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,36rem)_minmax(0,22rem)] lg:justify-center lg:gap-x-8">
        {/* Kopf, Übung und Ziel */}
        <div className="order-1 lg:col-start-1 lg:row-start-1">
          {kopf(farbe.stroke)}
          {hinweise}
          <section aria-labelledby="uebung-name" className="mb-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <MusterChip muster={info.muster} />
              {ersetzt && (
                <span className="rounded-full bg-warn-soft px-3 py-1 text-sm font-semibold text-warn-ink">
                  {t.ersetztBadge}
                </span>
              )}
            </div>
            <p className="text-sm text-ink-3">
              {t.position(
                BLOCK_NAME[schritt.block],
                schritt.runde,
                schritt.runden,
                schritt.position,
                schritt.anzahlImBlock,
              )}
            </p>
            <h1
              id="uebung-name"
              className="mt-1 text-balance text-4xl font-bold leading-tight tracking-tight lg:text-[2.75rem]"
            >
              {info.name}
            </h1>
          </section>
        </div>

        {/* Seitenfeld ab 1024 px: Vorschlag, Letztes Mal, Video, Ausführung, Ersetzen */}
        <div className="contents lg:sticky lg:top-6 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:block lg:self-start">
          <div className="order-2 mb-5 space-y-3 lg:mb-3">
            <InfoKarte symbol={<IconZiel className="size-5" />} klasse={farbe.soft}>
              <p className="text-base">
                <span className="font-semibold">{t.ziel}:</span> {info.zielText} · RPE{" "}
                {daten.rpeMin === daten.rpeMax ? daten.rpeMin : `${daten.rpeMin}–${daten.rpeMax}`}
              </p>
            </InfoKarte>
            {vorschlagText && (
              <InfoKarte
                symbol={<IconBlitz className="size-5 text-accent-ink" />}
                klasse="bg-accent-soft"
              >
                <p className="font-medium">{vorschlagText}</p>
              </InfoKarte>
            )}
            <InfoKarte
              symbol={<IconUhr className="size-5 text-ink-3" />}
              klasse="bg-surface shadow-card"
            >
              <p>
                <span className="font-semibold">{t.letztesMal}:</span>{" "}
                {info.letzte
                  ? `${datumTagMonat(info.letzte.datum)} · ${info.letzte.saetze.map(formatSatz).join(" | ")}`
                  : t.keinLetztesMal}
              </p>
            </InfoKarte>
          </div>

          <div className="order-4 mt-2 space-y-3 lg:mt-0">
            {info.videoUrl && <VideoKnopf url={info.videoUrl} className="w-full" />}

            <Aufklapp
              titel={t.ausfuehrung}
              symbol={<IconBuch className="size-6" />}
              offen={grossBildschirm}
            >
              <div className="space-y-4 p-4 text-[15px] leading-relaxed">
                <ol className="list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-ink-3">
                  {info.ausfuehrung.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ol>
                <div>
                  <p className="mb-1.5 font-semibold">{t.fehlerTitel}</p>
                  <ul className="list-disc space-y-1.5 pl-5 marker:text-bad">
                    {info.fehler.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
                <p className="text-ink-2">{info.hinweise}</p>
              </div>
            </Aufklapp>

            {!korrektur && (
              <Aufklapp titel={t.ersetzen} symbol={<IconTausch className="size-6" />}>
                <p className="px-4 py-3 text-sm text-ink-3">{t.ersetzenHilfe}</p>
                <div className="divide-y divide-line border-t border-line">
                  {ersetzt && (
                    <button
                      type="button"
                      onClick={() => ersetze(schritt.geplanteUebungId)}
                      className={`${aktionsZeile} text-accent-ink`}
                    >
                      <IconZurueck className="size-5" />
                      {t.zurueckZurGeplanten(
                        uebungen[schritt.geplanteUebungId]?.name ?? schritt.geplanteUebungId,
                      )}
                    </button>
                  )}
                  {kandidaten.length === 0 && !ersetzt && (
                    <p className="px-4 py-3 text-sm">{t.ersetzenKeine}</p>
                  )}
                  {kandidaten
                    .filter((k) => k.id !== schritt.geplanteUebungId || !ersetzt)
                    .map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => ersetze(k.id)}
                        className={`${aktionsZeile} text-ink`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block">{k.name}</span>
                          <span className="block text-sm font-normal text-ink-3">
                            Stufe {k.stufe}
                            {k.einseitig ? " · einseitig" : ""}
                          </span>
                        </span>
                        <IconTausch className="size-5 shrink-0 text-ink-3" />
                      </button>
                    ))}
                </div>
              </Aufklapp>
            )}
          </div>
        </div>

        {/* Eingabe */}
        <div className="order-3 lg:col-start-1 lg:row-start-2">
          <SatzFormular
            key={`${schritt.key}:${exerciseId}:${korrektur ? "k" : "n"}`}
            info={info}
            startWerte={startWerte}
            korrektur={korrektur}
            onErledigt={onErledigt}
            onKorrekturVerwerfen={() => {
              setBearbeiteKey(null);
              setPhase(phaseVorKorrektur.current ?? { art: "satz" });
              phaseVorKorrektur.current = null;
            }}
          />
        </div>

        <div className="order-5 lg:col-start-1 lg:row-start-3">{mehr}</div>
      </div>
    </Rahmen>
  );
}
