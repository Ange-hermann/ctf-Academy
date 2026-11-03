/**
 * Carillon de notification dans l'application (app ouverte au premier plan).
 * Préférence stockée par appareil ; la lecture exige le consentement de
 * l'utilisateur (politique autoplay des navigateurs).
 */
const SOUND_KEY = "ctf-notif-sound";

export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
  } catch {
    /* stockage indisponible : préférence non persistée */
  }
}

let audio: AudioContext | null = null;

/** Petit carillon deux tons, joué uniquement si l'utilisateur a activé le son. */
export async function playChime(): Promise<void> {
  if (!isSoundEnabled()) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") await audio.resume();
    if (audio.state !== "running") return;
    const now = audio.currentTime;
    for (const [freq, offset] of [
      [880, 0],
      [1174.66, 0.14],
    ] as const) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.16, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.4);
      osc.connect(gain).connect(audio.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.45);
    }
  } catch {
    /* audio indisponible : silencieux */
  }
}
