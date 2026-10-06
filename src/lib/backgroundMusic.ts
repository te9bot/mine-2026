import { CONFIG } from "@/config/constants";

let audio: HTMLAudioElement | null = null;
let fadeFrame = 0;

function fadeTo(target: number, onDone?: () => void) {
  if (!audio) return;
  cancelAnimationFrame(fadeFrame);
  const element = audio;
  const start = element.volume;
  const begin = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, Math.max(0, (now - begin) / (CONFIG.music.FADE_SECONDS * 1000)));
    element.volume = Math.min(1, Math.max(0, start + (target - start) * t));
    if (t < 1) fadeFrame = requestAnimationFrame(step);
    else onDone?.();
  };
  fadeFrame = requestAnimationFrame(step);
}

export function isMusicPlaying() {
  return !!audio && !audio.paused;
}

export async function toggleBackgroundMusic(): Promise<boolean> {
  if (!audio) {
    audio = new Audio(CONFIG.music.URL);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
  }
  if (!audio.paused) {
    const element = audio;
    fadeTo(0, () => element.pause());
    return false;
  }
  try {
    await audio.play();
    fadeTo(CONFIG.music.VOLUME);
    return true;
  } catch {
    return false;
  }
}
