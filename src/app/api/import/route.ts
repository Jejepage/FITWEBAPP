import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { BACKUP_MAX_BYTES, type BackupArt } from "@/domain/backup-types";
import { importiereDatei } from "@/server/backup";

export const dynamic = "force-dynamic";

const ZIEL = "/einstellungen/daten";

/** Relative Weiterleitung: unabhängig davon, unter welcher Adresse die App erreichbar ist. */
function zurueck(params: URLSearchParams, status = 303): Response {
  return new Response(null, { status, headers: { Location: `${ZIEL}?${params}` } });
}

function fehlerAntwort(...fehler: string[]): Response {
  const p = new URLSearchParams({ ergebnis: "fehler" });
  for (const f of fehler.slice(0, 11)) p.append("fehler", f.slice(0, 300));
  return zurueck(p);
}

/** Nur Anfragen von der eigenen Seite: ein fremder Browser-Tab darf keinen Import auslösen. */
function istGleicheHerkunft(req: Request): boolean {
  const origin = req.headers.get("origin");
  // Hinter einem Reverse-Proxy (später z. B. Caddy für HTTPS) kann der Host-Header umgeschrieben sein.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;
  if (!origin) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Liest den Body bis `max` Bytes; `null`, wenn er größer ist. */
async function leseBegrenzt(req: Request, max: number): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!req.body) return new Uint8Array();
  const teile: Uint8Array[] = [];
  let summe = 0;
  const reader = req.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    summe += value.byteLength;
    if (summe > max) {
      await reader.cancel();
      return null;
    }
    teile.push(value);
  }
  const alles = new Uint8Array(summe);
  let pos = 0;
  for (const t of teile) {
    alles.set(t, pos);
    pos += t.byteLength;
  }
  return alles;
}

export async function POST(req: Request): Promise<Response> {
  if (!istGleicheHerkunft(req)) return new Response("Forbidden", { status: 403 });

  const laenge = Number(req.headers.get("content-length") ?? 0);
  if (laenge > BACKUP_MAX_BYTES + 4096) {
    return fehlerAntwort("Die Datei ist zu groß (höchstens 20 MB).");
  }

  // Den Body gedeckelt lesen: Anfragen ohne (oder mit falscher) Content-Length dürfen den
  // Speicher nicht füllen.
  const body = await leseBegrenzt(req, BACKUP_MAX_BYTES + 4096);
  if (body === null) return fehlerAntwort("Die Datei ist zu groß (höchstens 20 MB).");
  let form: FormData;
  try {
    form = await new Response(body, {
      headers: { "content-type": req.headers.get("content-type") ?? "" },
    }).formData();
  } catch {
    return fehlerAntwort("Die Anfrage konnte nicht gelesen werden.");
  }
  const art: BackupArt = form.get("art") === "katalog" ? "katalog" : "alles";
  if (art === "alles" && form.get("bestaetigt") !== "ersetzen") {
    return fehlerAntwort("Bitte bestätige, dass alle aktuellen Daten ersetzt werden.");
  }
  const datei = form.get("datei");
  if (!(datei instanceof File) || datei.size === 0) {
    return fehlerAntwort("Bitte eine Datei auswählen.");
  }
  if (datei.size > BACKUP_MAX_BYTES)
    return fehlerAntwort("Die Datei ist zu groß (höchstens 20 MB).");

  let roh: unknown;
  try {
    roh = JSON.parse(await datei.text());
  } catch {
    return fehlerAntwort("Die Datei ist keine gültige JSON-Datei.");
  }

  const r = importiereDatei(db, roh, art);
  if (!r.ok) return fehlerAntwort(...r.fehler);

  revalidatePath("/", "layout");
  const p = new URLSearchParams({ ergebnis: "ok", art });
  for (const [k, v] of Object.entries(r.bilanz)) if (v !== undefined) p.set(k, String(v));
  return zurueck(p);
}
