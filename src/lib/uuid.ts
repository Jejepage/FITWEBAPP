/**
 * Neue zufällige ID im UUID-v4-Format. `crypto.randomUUID()` gibt es nur in sicheren Kontexten
 * (HTTPS/localhost); über HTTP im Heimnetz fehlt es, `getRandomValues` ist dort verfügbar.
 */
export function neueUuid(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();

  const b = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(b);
  else for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);

  b[6] = (b[6]! & 0x0f) | 0x40; // Version 4
  b[8] = (b[8]! & 0x3f) | 0x80; // Variante
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
  return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h
    .slice(8, 10)
    .join("")}-${h.slice(10).join("")}`;
}
