export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { runMigrationsAndSeed } = await import("./db/bootstrap");
    runMigrationsAndSeed();
  } catch (err) {
    // Ohne funktionierende Datenbank ist die App unbrauchbar: laut scheitern statt halb starten.
    console.error("Datenbank-Initialisierung fehlgeschlagen (Migration/Seed):", err);
    throw err;
  }
}
