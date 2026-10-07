// Hinweis am Pausenende: Vibration (Android) und kurzer Ton. Beides ist bestmöglich und darf nie
// werfen; die Anzeige im Bildschirm bleibt der verlässliche Hinweis (iOS vibriert nicht).
let audio: AudioContext | null = null;

/** Beim Tippen aufrufen (Nutzergeste), damit der Ton am Pausenende abspielbar ist. */
export function bereiteSignalVor(): void {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audio ??= new Ctor();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    /* kein Ton möglich */
  }
}

export function signal(): void {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    /* ignorieren */
  }
  try {
    if (!audio) return;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.25);
  } catch {
    /* ignorieren */
  }
}
