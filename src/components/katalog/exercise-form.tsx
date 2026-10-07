"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import type { FormState } from "@/app/katalog/form-state";
import { Checkbox, FehlerBanner, Feld, Gruppe } from "@/components/form-felder";
import { eingabe, knopfPrimaer, knopfSekundaer } from "@/components/ui";
import { GRUPPEN_ANZAHL, type ExerciseFormWerte } from "@/domain/exercise-form";
import {
  BELASTUNGSARTEN,
  EQUIPMENT_AUSWAHL,
  EQUIPMENT_NAMEN,
  MUSTER,
  MUSTER_NAMEN,
  PRUEFSTATI,
  STEIGERUNGSARTEN,
  type Exercise,
} from "@/domain/types";
import { de } from "@/i18n/de";

const t = de.katalog;
const f = t.feld;

export function ExerciseForm({
  aktion,
  werte,
  abbrechenHref,
  muster,
  kandidaten,
}: {
  aktion: (prev: FormState, fd: FormData) => Promise<FormState>;
  werte: ExerciseFormWerte;
  abbrechenHref: string;
  /** Beim Anlegen: Muster wählbar. Beim Bearbeiten: undefined (Muster ist fest). */
  muster?: string;
  /** Nur beim Bearbeiten: mögliche Nachbarn in der Stufenleiter. */
  kandidaten?: { leichter: Exercise[]; schwerer: Exercise[] };
}) {
  const [state, formAction, pending] = useActionState(aktion, {} as FormState);
  const w = state.werte ?? werte;
  const fehler = state.fehler ?? {};
  const hatFehler = Object.keys(fehler).length > 0;
  // Ändert sich der Zustand (z. B. nach einem Fehler), werden die Felder mit den
  // zurückgegebenen Werten neu aufgebaut, damit nichts verloren geht.
  const formKey = state.werte ? JSON.stringify(state.werte) : "initial";

  // Nach einem Fehler zur ersten Meldung scrollen (das Formular ist am Handy lang).
  useEffect(() => {
    if (hatFehler) document.querySelector("form [role=alert]")?.scrollIntoView({ block: "center" });
  }, [state, hatFehler]);

  return (
    <form key={formKey} action={formAction} noValidate>
      {hatFehler && <FehlerBanner>{fehler._form ?? t.formularFehler}</FehlerBanner>}

      {muster !== undefined && (
        <Feld label={f.muster} fehler={fehler.muster}>
          <select name="muster" defaultValue={state.muster ?? muster} className={eingabe}>
            <option value="">{f.keine}</option>
            {MUSTER.map((m) => (
              <option key={m} value={m}>
                {MUSTER_NAMEN[m]} ({m})
              </option>
            ))}
          </select>
        </Feld>
      )}

      <Feld label={f.name} fehler={fehler.name}>
        <input name="name" defaultValue={w.name} className={eingabe} />
      </Feld>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Feld label={f.stufe} fehler={fehler.stufe}>
          <input
            name="stufe"
            type="number"
            inputMode="numeric"
            min={1}
            max={5}
            defaultValue={Number.isFinite(w.stufe) ? w.stufe : ""}
            className={eingabe}
          />
        </Feld>
        <Feld label={f.belastungsart} fehler={fehler.belastungsart}>
          <select name="belastungsart" defaultValue={w.belastungsart} className={eingabe}>
            {BELASTUNGSARTEN.map((b) => (
              <option key={b} value={b}>
                {t.belastungsarten[b]}
              </option>
            ))}
          </select>
        </Feld>
      </div>

      <Checkbox name="einseitig" label={f.einseitig} checked={w.einseitig} />

      <Feld
        label={f.standardBereich}
        hilfe={f.standardBereichHilfe}
        fehler={fehler.standardBereich}
      >
        <input name="standardBereich" defaultValue={w.standardBereich} className={eingabe} />
      </Feld>

      <Gruppe legende={f.steigerungsart} fehler={fehler.steigerungsart}>
        {STEIGERUNGSARTEN.map((s) => (
          <Checkbox
            key={s}
            name="steigerungsart"
            value={s}
            label={t.steigerungsarten[s]}
            checked={w.steigerungsart.includes(s)}
          />
        ))}
      </Gruppe>

      <Feld label={f.hauptmuskeln} hilfe={f.hauptmuskelnHilfe} fehler={fehler.hauptmuskeln}>
        <textarea
          name="hauptmuskeln"
          rows={3}
          defaultValue={w.hauptmuskeln.join("\n")}
          className={eingabe}
        />
      </Feld>
      <Feld label={f.ausfuehrung} hilfe={f.ausfuehrungHilfe} fehler={fehler.ausfuehrung}>
        <textarea
          name="ausfuehrung"
          rows={6}
          defaultValue={w.ausfuehrung.join("\n")}
          className={eingabe}
        />
      </Feld>
      <Feld label={f.fehler} hilfe={f.fehlerHilfe} fehler={fehler.fehler}>
        <textarea name="fehler" rows={4} defaultValue={w.fehler.join("\n")} className={eingabe} />
      </Feld>
      <Feld label={f.hinweise} fehler={fehler.hinweise}>
        <textarea name="hinweise" rows={4} defaultValue={w.hinweise} className={eingabe} />
      </Feld>

      <h2 className="mb-1 mt-6 text-lg font-semibold">{f.equipment}</h2>
      <p className="mb-3 text-sm text-neutral-500">{f.equipmentHilfe}</p>
      {Array.from({ length: GRUPPEN_ANZAHL }, (_, i) => (
        <Gruppe key={i} legende={f.gruppe(i + 1)} fehler={i === 0 ? fehler.equipment : undefined}>
          <div className="grid sm:grid-cols-2">
            {EQUIPMENT_AUSWAHL.map((art) => (
              <Checkbox
                key={art}
                name={`gruppe${i}`}
                value={art}
                label={EQUIPMENT_NAMEN[art]}
                checked={w.equipment[i]?.includes(art) ?? false}
              />
            ))}
          </div>
        </Gruppe>
      ))}

      <Gruppe legende={f.optionaleLast} fehler={fehler.optionaleLast}>
        <div className="grid sm:grid-cols-2">
          {EQUIPMENT_AUSWAHL.map((art) => (
            <Checkbox
              key={art}
              name="optionaleLast"
              value={art}
              label={EQUIPMENT_NAMEN[art]}
              checked={w.optionaleLast.includes(art)}
            />
          ))}
        </div>
      </Gruppe>

      <h2 className="mb-2 mt-6 text-lg font-semibold">{t.stufenleiter}</h2>
      {kandidaten ? (
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Feld label={f.leichter} fehler={fehler.leichterId}>
            <select name="leichterId" defaultValue={w.leichterId ?? ""} className={eingabe}>
              <option value="">{f.keine}</option>
              {kandidaten.leichter.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.id} {k.name} (Stufe {k.stufe})
                </option>
              ))}
            </select>
          </Feld>
          <Feld label={f.schwerer} fehler={fehler.schwererId}>
            <select name="schwererId" defaultValue={w.schwererId ?? ""} className={eingabe}>
              <option value="">{f.keine}</option>
              {kandidaten.schwerer.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.id} {k.name} (Stufe {k.stufe})
                </option>
              ))}
            </select>
          </Feld>
        </div>
      ) : (
        <p className="mb-4 text-sm text-neutral-500">{f.leiterNurBeimBearbeiten}</p>
      )}

      <h2 className="mb-2 mt-6 text-lg font-semibold">Status</h2>
      <Checkbox name="aktiv" label={f.aktiv} checked={w.aktiv} />
      <Feld label={f.pruefstatus} fehler={fehler.pruefstatus}>
        <select name="pruefstatus" defaultValue={w.pruefstatus} className={eingabe}>
          {PRUEFSTATI.map((p) => (
            <option key={p} value={p}>
              {f.pruefstati[p]}
            </option>
          ))}
        </select>
      </Feld>

      <div className="sticky bottom-16 -mx-4 mt-6 flex gap-3 border-t border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950 md:static md:mx-0 md:border-0 md:px-0">
        <button type="submit" disabled={pending} className={knopfPrimaer}>
          {t.speichern}
        </button>
        <Link href={abbrechenHref} className={knopfSekundaer}>
          {t.abbrechen}
        </Link>
      </div>
    </form>
  );
}
