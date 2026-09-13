export const NOTIFY_SOUND_KEY = "jcsc_notify_sound";

export function isNotificationSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(NOTIFY_SOUND_KEY) !== "false";
}

export function setNotificationSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTIFY_SOUND_KEY, String(enabled));
}

let audioUnlocked = false;

/** Browsers block audio until the user interacts with the page once. */
export function unlockNotificationAudio() {
  if (audioUnlocked || typeof window === "undefined") return;
  audioUnlocked = true;
  try {
    const ctx = new AudioContext();
    void ctx.resume().finally(() => void ctx.close());
  } catch {
    // ignore
  }
}

export function playNotificationSound(options?: { force?: boolean }) {
  if (typeof window === "undefined") return;
  if (!options?.force && !isNotificationSoundEnabled()) return;

  try {
    const ctx = new AudioContext();
    const startAt = ctx.currentTime;

    const tone = (frequency: number, when: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(0.12, when + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
      osc.start(when);
      osc.stop(when + duration + 0.05);
    };

    tone(880, startAt, 0.12);
    tone(1174.66, startAt + 0.1, 0.18);

    window.setTimeout(() => void ctx.close(), 600);
  } catch {
    // Autoplay blocked or AudioContext unavailable
  }
}
