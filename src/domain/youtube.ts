// YouTube-Links für Übungen. Eingegeben werden darf jede übliche Schreibweise; gespeichert und
// verlinkt wird immer die daraus neu aufgebaute Standardadresse. So landet nie ein fremder oder
// gefährlicher Link (javascript:, youtube.com.evil.net, …) in der Datenbank. Rein, ohne DOM.

export interface YoutubeLink {
  /** Standardadresse: https://www.youtube.com/watch?v=<ID>[&t=<Sekunden>s] */
  url: string;
  /** 11-stellige Video-ID */
  id: string;
}

const HOSTS: ReadonlySet<string> = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
]);

const ID = /^[A-Za-z0-9_-]{11}$/;
/** Ohne Schema eingegebene Adressen wie "youtube.com/watch?v=…" ergänzen wir um https://. */
const OHNE_SCHEMA = /^(?:www\.|m\.|music\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)\//i;
const MAX_LAENGE = 300;
/** Startzeit höchstens 12 Stunden (alles darüber ist kein sinnvoller Startpunkt). */
const MAX_START_SEK = 12 * 3600;

/** "90", "90s", "1m30s", "1h2m3s" → Sekunden; sonst 0. */
function startSekunden(roh: string | null): number {
  if (!roh) return 0;
  const m = /^(?:(\d{1,5})h)?(?:(\d{1,5})m)?(?:(\d{1,5})s?)?$/i.exec(roh.trim());
  if (!m || (m[1] === undefined && m[2] === undefined && m[3] === undefined)) return 0;
  const sek = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return sek > 0 && sek <= MAX_START_SEK ? sek : 0;
}

/** Wandelt eine eingegebene YouTube-Adresse in die Standardform um; null, wenn sie nicht passt. */
export function normalisiereYoutubeUrl(eingabe: string): YoutubeLink | null {
  const text = eingabe.trim();
  if (text.length === 0 || text.length > MAX_LAENGE) return null;
  let url: URL;
  try {
    url = new URL(OHNE_SCHEMA.test(text) ? `https://${text}` : text);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username !== "" || url.password !== "" || url.port !== "") return null;
  const host = url.hostname.toLowerCase();
  if (!HOSTS.has(host)) return null;

  const teile = url.pathname.split("/").filter(Boolean);
  let id: string | undefined;
  if (host === "youtu.be") {
    id = teile[0];
  } else if (teile[0] === "watch" && teile.length === 1) {
    id = url.searchParams.get("v") ?? undefined;
  } else if (["shorts", "embed", "live", "v"].includes(teile[0] ?? "") && teile.length === 2) {
    id = teile[1];
  }
  if (id === undefined || !ID.test(id)) return null;

  const sek = startSekunden(url.searchParams.get("t") ?? url.searchParams.get("start"));
  return {
    id,
    url: `https://www.youtube.com/watch?v=${id}${sek > 0 ? `&t=${sek}s` : ""}`,
  };
}

export type VideoEingabe = { ok: true; url: string | null } | { ok: false };

/** Formularwert: leer = kein Link, sonst muss es ein gültiger YouTube-Link sein. */
export function parseVideoEingabe(eingabe: string): VideoEingabe {
  if (eingabe.trim() === "") return { ok: true, url: null };
  const link = normalisiereYoutubeUrl(eingabe);
  return link ? { ok: true, url: link.url } : { ok: false };
}

/** Zum Anzeigen: gespeicherten Wert prüfen und die sichere Standardadresse liefern (sonst null). */
export function videoLink(gespeichert: string | null | undefined): YoutubeLink | null {
  return gespeichert ? normalisiereYoutubeUrl(gespeichert) : null;
}

/** Ist der Text bereits genau die Standardform? (Schema-Prüfung für gespeicherte Werte.) */
export function istStandardYoutubeUrl(text: string): boolean {
  return normalisiereYoutubeUrl(text)?.url === text;
}
