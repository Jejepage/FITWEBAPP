"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { VideoKnopf } from "@/components/katalog/video-knopf";
import { knopfPrimaer, knopfSekundaer } from "@/components/ui";
import { useWakeLock } from "./hooks";
import { SatzFormular } from "./satz-formular";
import type { GespeicherterSatzInfo, TrainingsDaten, UebungInfo } from "./typen";

const t = de.training;
const BLOCK_NAME: Record<Block, string> = { "1": t.block1, "2": t.block2, Z: t.blockZ };

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

function VorschlagHinweis({ info }: { info: UebungInfo }) {
  const text = vorschlagGrundText(info.vorschlag.grund, info.schwererName);
  if (!text) return null;
  return <p className="mt-1 text-sm font-medium text-brand">{text}</p>;
}

export function TrainingsAnsicht({ daten }: { daten: TrainingsDaten }) {
  const router = useRouter();
  const { schritte } = daten;
  const { verfuegbar: wakeLockVerfuegbar } = useWakeLock(true);

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
      [schritt.key]: { id, key: schritt.key, exerciseId, werte, status: "wartet" },
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
  const kopf = (
    <header className="mb-4">
      <p className="text-sm font-medium text-neutral-500">
        {t.kopf(daten.einheit, daten.woche)}
        {daten.adHoc && (
          <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
            {de.adhoc.kopfBadge(daten.profilName)}
          </span>
        )}
      </p>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={schritte.length}
        aria-valuenow={erledigteKeys.size}
        aria-label={t.fortschritt(erledigteKeys.size, schritte.length)}
      >
        <div
          className="h-full bg-brand transition-all"
          style={{ width: `${(erledigteKeys.size / Math.max(schritte.length, 1)) * 100}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        {t.fortschritt(erledigteKeys.size, schritte.length)}
      </p>
    </header>
  );

  const hinweise = (
    <>
      {!wakeLockVerfuegbar && (
        <p className="mb-3 rounded-lg bg-neutral-100 p-3 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          {t.bildschirm.kannNicht}
        </p>
      )}
      {wartendAnzahl > 0 && (
        <p
          role="status"
          className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          {t.speichern.wartet(wartendAnzahl)}{" "}
          <button
            type="button"
            onClick={verwirfWartende}
            className="min-h-11 font-medium underline"
          >
            {t.speichern.verwerfen}
          </button>
        </p>
      )}
      {meldung && <FehlerBanner>{meldung}</FehlerBanner>}
    </>
  );

  const mehr = (
    <details className="mt-8 rounded-xl border border-neutral-200 dark:border-neutral-800">
      <summary className="min-h-11 cursor-pointer list-none px-4 py-3 font-medium">
        {t.mehr.titel}
      </summary>
      <div className="flex flex-col gap-2 border-t border-neutral-200 p-4 dark:border-neutral-800">
        {erledigteKeys.size > 0 && effektivePhase.art !== "fertig" && (
          <button type="button" onClick={vorigenAendern} className={knopfSekundaer}>
            {t.mehr.vorigenAendern}
          </button>
        )}
        {effektivePhase.art !== "fertig" && erledigteKeys.size > 0 && (
          <button type="button" onClick={vorzeitig} className={knopfSekundaer}>
            {t.mehr.vorzeitigAbschliessen}
          </button>
        )}
        <button
          type="button"
          onClick={abbrechen}
          className={`${knopfSekundaer} text-red-700 dark:text-red-400`}
        >
          {t.mehr.abbrechen}
        </button>
      </div>
    </details>
  );

  if (beendet) return <p role="status">…</p>;

  // Aufwärmen
  if (effektivePhase.art === "aufwaermen") {
    return (
      <>
        {kopf}
        {hinweise}
        <section
          aria-labelledby="aufwaermen-titel"
          className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <h1 id="aufwaermen-titel" className="mb-2 text-2xl font-bold">
            {t.aufwaermenTitel}
          </h1>
          <p className="whitespace-pre-line">{daten.aufwaermenText}</p>
          <p className="mt-3 text-sm text-neutral-500">{t.aufwaermenHilfe}</p>
        </section>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setPhase({ art: "satz" })}
            className={`${knopfPrimaer} min-h-16 w-full text-xl`}
          >
            {t.aufwaermenErledigt}
          </button>
        </div>
        {mehr}
      </>
    );
  }

  // Blockwechsel
  if (effektivePhase.art === "block") {
    const imBlock = schritte.filter((s) => s.block === effektivePhase.naechster && s.runde === 1);
    const fertigerBlock = offenerIndex > 0 ? schritte[offenerIndex - 1]?.block : undefined;
    return (
      <>
        {kopf}
        {hinweise}
        <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="mb-1 text-2xl font-bold">
            {t.block.geschafft(BLOCK_NAME[fertigerBlock ?? "1"])}
          </h1>
          <p className="mb-3 text-sm text-neutral-500">
            {t.block.naechster}: {BLOCK_NAME[effektivePhase.naechster]}
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            {imBlock.map((s) => (
              <li key={s.key}>{uebungen[wirksameId(s)]?.name ?? wirksameId(s)}</li>
            ))}
          </ol>
        </section>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setPhase({ art: "satz" })}
            className={`${knopfPrimaer} min-h-16 w-full text-xl`}
          >
            {t.block.weiter}
          </button>
        </div>
        {mehr}
      </>
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
      <>
        {kopf}
        {hinweise}
        <h1 className="mb-1 text-2xl font-bold">{t.fertig.titel}</h1>
        <p className="mb-4 text-sm text-neutral-500">{t.fertig.hilfe}</p>
        {nachUebung.size === 0 ? (
          <FehlerBanner>{t.fertig.keineSaetze}</FehlerBanner>
        ) : (
          <ul className="mb-4 space-y-3">
            {[...nachUebung.entries()].map(([id, saetze]) => (
              <li
                key={id}
                className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <p className="font-semibold">{uebungen[id]?.name ?? id}</p>
                <ol className="mt-1 list-decimal pl-5 text-sm text-neutral-600 dark:text-neutral-400">
                  {saetze.map((g) => (
                    <li key={g.id}>{formatSatz(g.werte)}</li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        )}
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium">{t.fertig.notiz}</span>
          <textarea
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={t.fertig.notizPlatzhalter}
            className="block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        <button
          type="button"
          onClick={abschliessen}
          disabled={wartendAnzahl > 0 || nachUebung.size === 0}
          className={`${knopfPrimaer} min-h-16 w-full text-xl disabled:opacity-50`}
        >
          {wartendAnzahl > 0 ? t.fertig.warteSpeichern : t.fertig.abschliessen}
        </button>
        {offenerIndex >= 0 && (
          <button
            type="button"
            onClick={() => setPhase({ art: "satz" })}
            className={`${knopfSekundaer} mt-3 w-full`}
          >
            {t.fertig.zurueck}
          </button>
        )}
        {mehr}
      </>
    );
  }

  // Der Satz braucht einen aktuellen Schritt
  if (!schritt) return null;
  const exerciseId = wirksameId(schritt);
  const info = uebungen[exerciseId];
  if (!info) return <FehlerBanner>{t.ersetzenFehler}</FehlerBanner>;
  const ersetzt = exerciseId !== schritt.geplanteUebungId;

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

  return (
    <>
      {kopf}
      {hinweise}
      <section aria-labelledby="uebung-name" className="mb-4">
        <p className="text-sm text-neutral-500">
          {t.position(
            BLOCK_NAME[schritt.block],
            schritt.runde,
            schritt.runden,
            schritt.position,
            schritt.anzahlImBlock,
          )}
        </p>
        <h1 id="uebung-name" className="text-3xl font-bold leading-tight">
          {info.name}
          {ersetzt && (
            <span className="ml-2 align-middle text-sm font-medium text-amber-700 dark:text-amber-300">
              {t.ersetztBadge}
            </span>
          )}
        </h1>
        <p className="mt-2 text-base">
          <span className="text-neutral-500">{t.ziel}:</span> {info.zielText} · RPE{" "}
          {daten.rpeMin === daten.rpeMax ? daten.rpeMin : `${daten.rpeMin}–${daten.rpeMax}`}
        </p>
        <VorschlagHinweis info={info} />
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          <span className="font-medium">{t.letztesMal}:</span>{" "}
          {info.letzte
            ? `${datumTagMonat(info.letzte.datum)} · ${info.letzte.saetze.map(formatSatz).join(" | ")}`
            : t.keinLetztesMal}
        </p>
      </section>

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

      {info.videoUrl && <VideoKnopf url={info.videoUrl} className="mt-4 w-full" />}

      <details className="mt-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
        <summary className="min-h-11 cursor-pointer list-none px-4 py-3 font-medium">
          {t.ausfuehrung}
        </summary>
        <div className="space-y-3 border-t border-neutral-200 p-4 text-sm dark:border-neutral-800">
          <ol className="list-decimal space-y-1 pl-5">
            {info.ausfuehrung.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ol>
          <div>
            <p className="font-medium">{t.fehlerTitel}</p>
            <ul className="list-disc space-y-1 pl-5">
              {info.fehler.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
          <p className="text-neutral-600 dark:text-neutral-400">{info.hinweise}</p>
        </div>
      </details>

      {!korrektur && (
        <details className="mt-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <summary className="min-h-11 cursor-pointer list-none px-4 py-3 font-medium">
            {t.ersetzen}
          </summary>
          <div className="space-y-2 border-t border-neutral-200 p-4 dark:border-neutral-800">
            <p className="text-sm text-neutral-500">{t.ersetzenHilfe}</p>
            {ersetzt && (
              <button
                type="button"
                onClick={() => ersetze(schritt.geplanteUebungId)}
                className={`${knopfSekundaer} w-full`}
              >
                {t.zurueckZurGeplanten(
                  uebungen[schritt.geplanteUebungId]?.name ?? schritt.geplanteUebungId,
                )}
              </button>
            )}
            {kandidaten.length === 0 && !ersetzt && <p className="text-sm">{t.ersetzenKeine}</p>}
            {kandidaten
              .filter((k) => k.id !== schritt.geplanteUebungId || !ersetzt)
              .map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => ersetze(k.id)}
                  className={`${knopfSekundaer} w-full justify-between text-left`}
                >
                  <span>{k.name}</span>
                  <span className="text-sm text-neutral-500">
                    Stufe {k.stufe}
                    {k.einseitig ? " · einseitig" : ""}
                  </span>
                </button>
              ))}
          </div>
        </details>
      )}
      {mehr}
    </>
  );
}
