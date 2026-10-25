"use client";

/* أصوات Web Audio بلا ملفات — نفس أصوات الرابط الأصلي */

let AC: AudioContext | null = null;
let muted = false;

export function setMuted(v: boolean) {
  muted = v;
}
export function isMuted() {
  return muted;
}

function ac(): AudioContext | null {
  try {
    if (!AC) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      AC = new Ctor();
    }
    if (AC.state === "suspended") void AC.resume();
  } catch {
    return null;
  }
  return AC;
}

export function unlockAudio() {
  ac();
}

function tone(
  f: number,
  t0: number,
  d: number,
  type?: OscillatorType,
  v?: number,
  f2?: number,
) {
  try {
    const c = ac();
    if (!c || muted) return;
    const o = c.createOscillator();
    const g = c.createGain();
    const t = c.currentTime + t0;
    o.type = type || "sine";
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v || 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + d + 0.02);
  } catch {
    /* تجاهل */
  }
}

export const SND = {
  ok() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.25, "triangle", 0.14));
  },
  bad() {
    tone(220, 0, 0.3, "sawtooth", 0.09, 130);
    tone(150, 0.18, 0.35, "square", 0.06, 90);
  },
  whoosh(up: boolean) {
    tone(up ? 300 : 900, 0, 0.28, "sine", 0.08, up ? 1000 : 250);
  },
  click() {
    tone(700, 0, 0.05, "square", 0.04);
  },
  hover() {
    tone(950, 0, 0.03, "sine", 0.015);
  },
  tick() {
    tone(1300, 0, 0.05, "square", 0.05);
  },
  end() {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) =>
      tone(f, i * 0.13, 0.35, "triangle", 0.13),
    );
  },
};
