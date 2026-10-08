"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_TAGE, sichererPfad } from "@/domain/auth";
import { erstelleToken, passwortAusUmgebung, pruefePasswort, ratenbremse } from "@/server/auth";

const zurLogin = (weiter: string, fehler: "falsch" | "gesperrt"): never =>
  redirect(
    `/login?fehler=${fehler}${weiter === "/" ? "" : `&weiter=${encodeURIComponent(weiter)}`}`,
  );

/** Meldet mit dem Passwort aus APP_PASSWORD an: setzt das Sitzungs-Cookie und leitet weiter. */
export async function anmelden(fd: FormData): Promise<void> {
  const passwort = passwortAusUmgebung();
  const weiter = sichererPfad(String(fd.get("weiter") ?? ""));
  if (passwort === "") redirect(weiter);

  const jetzt = Date.now();
  if (ratenbremse.sperreSekunden(jetzt) > 0) zurLogin(weiter, "gesperrt");
  if (!pruefePasswort(String(fd.get("passwort") ?? ""), passwort)) {
    ratenbremse.fehlversuch(jetzt);
    zurLogin(weiter, ratenbremse.sperreSekunden(jetzt) > 0 ? "gesperrt" : "falsch");
  }
  ratenbremse.erfolg();

  const h = await headers();
  (await cookies()).set(SESSION_COOKIE, erstelleToken(passwort, jetzt), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TAGE * 86400,
    // Über HTTP im Heimnetz darf das Flag nicht gesetzt sein, sonst verwirft der Browser das Cookie.
    secure: h.get("x-forwarded-proto") === "https",
  });
  redirect(weiter);
}

export async function abmelden(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
