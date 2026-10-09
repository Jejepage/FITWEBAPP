"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import type { FormState } from "@/app/katalog/form-state";
import { Checkbox, FehlerBanner, Feld, Gruppe } from "@/components/form-felder";
import { eingabe, karte, knopfNeutral, knopfPrimaer, kopfzeileKlein } from "@/components/ui";
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

      <Abschnitt titel="Grunddaten">
        <div className="grid gap-x-5 md:grid-cols-2">
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

          <div className={muster === undefined ? "md:col-span-2" : ""}>
            <Feld label={f.name} fehler={fehler.name}>
              <input name="name" defaultValue={w.name} className={eingabe} />
            </Feld>
          </div>

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

          <Feld
            label={f.standardBereich}
            hilfe={f.standardBereichHilfe}
            fehler={fehler.standardBereich}
          >
            <input name="standardBereich" defaultValue={w.standardBereich} className={eingabe} />
          </Feld>
          <div className="md:pt-7">
            <Checkbox name="einseitig" label={f.einseitig} checked={w.einseitig} />
          </div>

          <div className="md:col-span-2">
            <Gruppe legende={f.steigerungsart} fehler={fehler.steigerungsart}>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3">
                {STEIGERUNGSARTEN.map((s) => (
                  <Checkbox
                    key={s}
                    name="steigerungsart"
                    value={s}
                    label={t.steigerungsarten[s]}
                    checked={w.steigerungsart.includes(s)}
                  />
                ))}
              </div>
            </Gruppe>
          </div>
        </div>
      </Abschnitt>

      <Abschnitt titel="Beschreibung">
        <div className="grid gap-x-5 md:grid-cols-2">
          <Feld label={f.hauptmuskeln} hilfe={f.hauptmuskelnHilfe} fehler={fehler.hauptmuskeln}>
            <textarea
              name="hauptmuskeln"
              rows={4}
              defaultValue={w.hauptmuskeln.join("\n")}
              className={eingabe}
            />
          </Feld>
          <Feld label={f.fehler} hilfe={f.fehlerHilfe} fehler={fehler.fehler}>
            <textarea
              name="fehler"
              rows={4}
              defaultValue={w.fehler.join("\n")}
              className={eingabe}
            />
          </Feld>
          <div className="md:col-span-2">
            <Feld label={f.ausfuehrung} hilfe={f.ausfuehrungHilfe} fehler={fehler.ausfuehrung}>
              <textarea
                name="ausfuehrung"
                rows={6}
                defaultValue={w.ausfuehrung.join("\n")}
                className={eingabe}
              />
            </Feld>
          </div>
          <Feld label={f.hinweise} fehler={fehler.hinweise}>
            <textarea name="hinweise" rows={4} defaultValue={w.hinweise} className={eingabe} />
          </Feld>
          <Feld label={f.videoUrl} hilfe={f.videoUrlHilfe} fehler={fehler.videoUrl}>
            <input
              type="text"
              name="videoUrl"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="https://www.youtube.com/watch?v=…"
              defaultValue={w.videoUrl}
              className={eingabe}
            />
          </Feld>
        </div>
      </Abschnitt>

      <Abschnitt titel={f.equipment} hilfe={f.equipmentHilfe}>
        <div className="grid gap-x-5 md:grid-cols-2">
          {Array.from({ length: GRUPPEN_ANZAHL }, (_, i) => (
            <Gruppe
              key={i}
              legende={f.gruppe(i + 1)}
              fehler={i === 0 ? fehler.equipment : undefined}
            >
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
        </div>
      </Abschnitt>

      <Abschnitt titel={t.stufenleiter}>
        {kandidaten ? (
          <div className="grid gap-x-5 md:grid-cols-2">
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
          <p className="text-[15px] text-ink-3">{f.leiterNurBeimBearbeiten}</p>
        )}
      </Abschnitt>

      <Abschnitt titel="Status">
        <div className="grid gap-x-5 md:grid-cols-2">
          <div className="md:pt-7">
            <Checkbox name="aktiv" label={f.aktiv} checked={w.aktiv} />
            <Checkbox name="ersatz" label={f.ersatz} hilfe={f.ersatzHilfe} checked={w.ersatz} />
          </div>
          <Feld label={f.pruefstatus} fehler={fehler.pruefstatus}>
            <select name="pruefstatus" defaultValue={w.pruefstatus} className={eingabe}>
              {PRUEFSTATI.map((p) => (
                <option key={p} value={p}>
                  {f.pruefstati[p]}
                </option>
              ))}
            </select>
          </Feld>
        </div>
      </Abschnitt>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 mt-6 flex gap-3 bg-overlay px-4 py-3 backdrop-blur-xl backdrop-saturate-150 sm:-mx-6 sm:px-6 lg:bottom-4 lg:mx-0 lg:rounded-card lg:border lg:border-line/50 lg:px-4 lg:shadow-card">
        <button
          type="submit"
          disabled={pending}
          className={`${knopfPrimaer} flex-1 lg:flex-none lg:px-10`}
        >
          {t.speichern}
        </button>
        <Link href={abbrechenHref} className={`${knopfNeutral} flex-1 lg:flex-none`}>
          {t.abbrechen}
        </Link>
      </div>
    </form>
  );
}

/** Gruppierter Formularabschnitt: kleine Überschrift über einer weichen Karte (iOS-Stil). */
function Abschnitt({
  titel,
  hilfe,
  children,
}: {
  titel: string;
  hilfe?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className={kopfzeileKlein}>{titel}</h2>
      <div className={karte}>
        {hilfe && <p className="mb-4 text-[15px] text-ink-3">{hilfe}</p>}
        {children}
      </div>
    </section>
  );
}
