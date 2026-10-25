"use client";

/* مؤثرات الخلفية والقصاصات — نفس فكرة الرابط الأصلي (Canvas بلا ملفات) */

type Particle = {
  k: "r" | "c";
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  c?: string;
  life: number;
  max: number;
};

type FxApi = {
  ripple: (x: number, y: number) => void;
  confetti: (x: number, y: number, n: number) => void;
  rain: () => void;
};

let active: FxApi | null = null;

export const fx = {
  ripple: (x: number, y: number) => active?.ripple(x, y),
  confetti: (x: number, y: number, n: number) => active?.confetti(x, y, n),
  rain: () => active?.rain(),
};

export function initFx(bg: HTMLCanvasElement, layer: HTMLCanvasElement): () => void {
  const ctxBg = bg.getContext("2d");
  const ctxFx = layer.getContext("2d");
  if (!ctxBg || !ctxFx) return () => {};
  const bx: CanvasRenderingContext2D = ctxBg;
  const fc: CanvasRenderingContext2D = ctxFx;

  const reduce =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const weak = (navigator.hardwareConcurrency || 8) <= 4;

  let W = 0;
  let H = 0;
  let raf = 0;
  let bgRaf = 0;
  let running = false;
  let disposed = false;
  let rainTimer: ReturnType<typeof setInterval> | null = null;
  let pts: { x: number; y: number; vx: number; vy: number }[] = [];
  let fxs: Particle[] = [];

  const size = () => {
    W = innerWidth;
    H = innerHeight;
    const r = Math.min(devicePixelRatio || 1, 2);
    [bg, layer].forEach((c) => {
      c.width = W * r;
      c.height = H * r;
    });
    bx.setTransform(r, 0, 0, r, 0, 0);
    fc.setTransform(r, 0, 0, r, 0, 0);
  };

  size();
  addEventListener("resize", size);

  if (!reduce && !weak) {
    pts = Array.from({ length: Math.min(55, Math.floor(W / 28)) }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
    }));
    const loop = () => {
      if (disposed) return;
      bx.clearRect(0, 0, W, H);
      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        bx.fillStyle = "rgba(46,230,214,.7)";
        bx.beginPath();
        bx.arc(p.x, p.y, 2, 0, 7);
        bx.fill();
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
          if (d < 130) {
            bx.strokeStyle = `rgba(255,79,216,${0.25 * (1 - d / 130)})`;
            bx.beginPath();
            bx.moveTo(pts[i].x, pts[i].y);
            bx.lineTo(pts[j].x, pts[j].y);
            bx.stroke();
          }
        }
      }
      bgRaf = requestAnimationFrame(loop);
    };
    bgRaf = requestAnimationFrame(loop);
  }

  const kick = () => {
    if (!running) {
      running = true;
      raf = requestAnimationFrame(fxLoop);
    }
  };

  function fxLoop() {
    if (disposed) return;
    fc.clearRect(0, 0, W, H);
    fxs = fxs.filter((p) => p.life > 0);
    for (const p of fxs) {
      p.life--;
      if (p.k === "r") {
        const t = 1 - p.life / p.max;
        fc.strokeStyle = `rgba(46,230,214,${1 - t})`;
        fc.lineWidth = 3;
        fc.beginPath();
        fc.arc(p.x, p.y, 10 + t * 90, 0, 7);
        fc.stroke();
      } else {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18;
        p.a += 0.2;
        fc.save();
        fc.translate(p.x, p.y);
        fc.rotate(p.a);
        fc.fillStyle = p.c ?? "#fff";
        fc.globalAlpha = Math.min(1, p.life / 20);
        fc.fillRect(-4, -3, 8, 6);
        fc.restore();
      }
    }
    if (fxs.length) raf = requestAnimationFrame(fxLoop);
    else {
      running = false;
      fc.clearRect(0, 0, W, H);
    }
  }

  active = {
    ripple(x, y) {
      if (reduce) return;
      fxs.push({ k: "r", x, y, vx: 0, vy: 0, a: 0, life: 30, max: 30 });
      kick();
    },
    confetti(x, y, n) {
      if (reduce) return;
      const cs = ["#2ee6d6", "#ff4fd8", "#ffd23f", "#2bff88", "#fff"];
      for (let i = 0; i < n; i++) {
        fxs.push({
          k: "c",
          x,
          y,
          vx: (Math.random() - 0.5) * 12,
          vy: -Math.random() * 12 - 2,
          a: 0,
          c: cs[i % 5],
          life: 90 + Math.random() * 40,
          max: 130,
        });
      }
      kick();
    },
    rain() {
      if (reduce) return;
      let t = 0;
      if (rainTimer) clearInterval(rainTimer);
      rainTimer = setInterval(() => {
        for (let i = 0; i < 8; i++) {
          fxs.push({
            k: "c",
            x: Math.random() * W,
            y: -10,
            vx: (Math.random() - 0.5) * 3,
            vy: Math.random() * 3 + 1,
            a: 0,
            c: ["#2ee6d6", "#ff4fd8", "#ffd23f", "#2bff88"][i % 4],
            life: 260,
            max: 260,
          });
        }
        kick();
        if (++t > 40 && rainTimer) {
          clearInterval(rainTimer);
          rainTimer = null;
        }
      }, 90);
    },
  };

  return () => {
    disposed = true;
    active = null;
    cancelAnimationFrame(raf);
    cancelAnimationFrame(bgRaf);
    if (rainTimer) clearInterval(rainTimer);
    removeEventListener("resize", size);
  };
}
