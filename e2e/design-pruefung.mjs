// Automatische Gestaltungsprüfungen einer geöffneten Seite (von design.mjs und design-lose.mjs genutzt).

/** Automatische Prüfungen im Browser; liefert eine Liste von Befunden. */
export async function pruefeSeite(page, { touch }) {
  return page.evaluate(
    ({ touch }) => {
      const befunde = [];
      const sichtbar = (el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return false;
        const s = getComputedStyle(el);
        return s.visibility !== "hidden" && s.display !== "none";
      };
      const name = (el) =>
        `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${
          typeof el.className === "string" && el.className
            ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
            : ""
        } "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30)}"`;

      // 1. kein horizontales Scrollen der Seite
      const de = document.documentElement;
      if (de.scrollWidth > window.innerWidth + 1) {
        const zu_breit = [...document.querySelectorAll("body *")]
          .filter(
            (el) =>
              sichtbar(el) &&
              el.getBoundingClientRect().right > window.innerWidth + 1,
          )
          .slice(0, 3)
          .map(name);
        befunde.push(
          `horizontales Scrollen (scrollWidth ${de.scrollWidth} > ${window.innerWidth}): ${zu_breit.join(" | ")}`,
        );
      }

      // 2. Tippflächen (nur Touch-Geräte) und Eingabeschrift
      const bedienbar = [
        ...document.querySelectorAll(
          'button, [role="button"], summary, select, textarea, input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), nav a',
        ),
      ].filter(sichtbar);
      for (const el of bedienbar) {
        const r = el.getBoundingClientRect();
        if (touch && (r.height < 43.5 || r.width < 43.5))
          befunde.push(
            `Tippfläche ${Math.round(r.width)}×${Math.round(r.height)} px: ${name(el)}`,
          );
        if (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) {
          const px = parseFloat(getComputedStyle(el).fontSize);
          if (px < 16)
            befunde.push(`Eingabeschrift ${px} px < 16: ${name(el)}`);
        }
      }
      // Auswahl-Labels (Checkbox/Radio): die Beschriftung zählt als Tippfläche
      if (touch) {
        for (const el of document.querySelectorAll(
          'input[type="checkbox"], input[type="radio"]',
        )) {
          if (!sichtbar(el) && !el.closest("label")) continue;
          const l = el.closest("label") ?? el;
          const r = l.getBoundingClientRect();
          if (
            r.width > 0 &&
            r.height < 43.5 &&
            getComputedStyle(l).display !== "contents"
          )
            befunde.push(
              `Tippfläche ${Math.round(r.width)}×${Math.round(r.height)} px: ${name(l)}`,
            );
        }
      }

      // 3. Textkontrast
      const zeichenflaeche = document.createElement("canvas");
      zeichenflaeche.width = zeichenflaeche.height = 1;
      const ctx = zeichenflaeche.getContext("2d", { willReadFrequently: true });
      const rgba = (s) => {
        const m = s.match(/^rgba?\(([^)]+)\)$/);
        if (m) {
          const t = m[1]
            .split(/[\s,/]+/)
            .filter(Boolean)
            .map(Number);
          return [t[0], t[1], t[2], t[3] ?? 1];
        }
        if (s === "transparent") return [0, 0, 0, 0];
        // lab(), oklch(), color-mix() usw. über die Zeichenfläche in sRGB umrechnen
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = "#000";
        ctx.fillStyle = s;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return [d[0], d[1], d[2], d[3] / 255];
      };
      const mische = (oben, unten) => {
        const a = oben[3];
        return [0, 1, 2]
          .map((i) => oben[i] * a + unten[i] * (1 - a))
          .concat([1]);
      };
      const lum = (c) => {
        const f = (v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
      };
      const verhaeltnis = (a, b) => {
        const x = lum(a);
        const y = lum(b);
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
      };
      const hintergrund = (el) => {
        const kette = [];
        for (let e = el; e; e = e.parentElement) kette.push(e);
        let farbe = rgba(getComputedStyle(document.body).backgroundColor);
        if (farbe[3] === 0) farbe = [255, 255, 255, 1];
        for (const e of kette.reverse()) {
          const s = getComputedStyle(e);
          if (s.backgroundImage !== "none") return null; // Verlauf/Bild: manuell prüfen
          const bg = rgba(s.backgroundColor);
          if (bg[3] > 0) farbe = mische(bg, farbe);
        }
        return farbe;
      };
      const deckkraft = (el) => {
        let o = 1;
        for (let e = el; e; e = e.parentElement)
          o *= parseFloat(getComputedStyle(e).opacity);
        return o;
      };
      const gesehen = new Set();
      for (const el of document.querySelectorAll("body *")) {
        if (!sichtbar(el) || el.closest("svg, option, [disabled], noscript"))
          continue;
        const hatText = [...el.childNodes].some(
          (n) => n.nodeType === 3 && n.textContent.trim().length > 0,
        );
        if (!hatText) continue;
        if (el.closest("[inert], [aria-hidden='true']")) continue;
        const s = getComputedStyle(el);
        const bg = hintergrund(el);
        if (!bg) continue;
        let text = rgba(s.color);
        const o = deckkraft(el);
        text = mische([text[0], text[1], text[2], text[3] * o], bg);
        const v = verhaeltnis(text, bg);
        const px = parseFloat(s.fontSize);
        const fett = parseInt(s.fontWeight, 10) >= 700;
        const gross = px >= 24 || (px >= 18.66 && fett);
        const min = gross ? 3 : 4.5;
        if (v < min) {
          const key = name(el) + v.toFixed(1);
          if (gesehen.has(key)) continue;
          gesehen.add(key);
          befunde.push(
            `Kontrast ${v.toFixed(2)}:1 < ${min}: ${name(el)} (${s.color})`,
          );
        }
      }
      return befunde
        .slice(0, 25)
        .concat(
          befunde.length > 25 ? [`… ${befunde.length - 25} weitere`] : [],
        );
    },
    { touch },
  );
}
