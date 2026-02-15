"use client";

import { useSettings } from "@/lib/settings";
import { useEffect, useRef, useCallback } from "react";

/**
 * ConfettiCanvas Props
 */
export type ConfettiCanvasProps = {
  /** Duration of the confetti burst in ms */
  duration?: number;
  /** Number of particles to spawn */
  particleCount?: number;
  /** Colour palette — cyberpunk defaults */
  colors?: string[];
  /** Whether confetti is actively firing */
  active?: boolean;
  /** Callback after the confetti finishes */
  onComplete?: () => void;
  /** Additional CSS classes */
  className?: string;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
  /** 0 = diamond, 1 = rect, 2 = circle */
  shape: number;
  gravity: number;
  drag: number;
  /** time-to-live in frames */
  ttl: number;
  age: number;
};

const DEFAULT_COLORS = [
  "#00ffff", // cyan
  "#ff3366", // accent red
  "#9933ff", // purple
  "#ffcc00", // yellow
  "#00ff66", // green
  "#ff66cc", // pink
  "#66ccff", // light blue
  "#ffffff", // white sparkle
];

/**
 * ConfettiCanvas — Full-viewport HTML5 Canvas particle burst.
 *
 * Spawns colourful confetti shapes that explode outward from the centre,
 * drift downward with gravity / drag, and fade out over the duration.
 * Respects the `animationsEnabled` user setting.
 */
export function ConfettiCanvas({
  duration = 3000,
  particleCount = 120,
  colors = DEFAULT_COLORS,
  active = true,
  onComplete,
  className,
}: ConfettiCanvasProps): React.ReactElement | null {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { settings } = useSettings();
  const animFrameRef = useRef<number>(0);

  const createParticle = useCallback(
    (cx: number, cy: number): Particle => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 10;
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4 - Math.random() * 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        width: 4 + Math.random() * 6,
        height: 6 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 1,
        shape: Math.floor(Math.random() * 3),
        gravity: 0.12 + Math.random() * 0.08,
        drag: 0.98 + Math.random() * 0.015,
        ttl: 80 + Math.floor(Math.random() * 60),
        age: 0,
      };
    },
    [colors]
  );

  useEffect(() => {
    if (!active || !settings.animationsEnabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Size to viewport
    const resize = (): void => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const cx = canvas.width / 2;
    const cy = canvas.height * 0.35; // burst from upper-centre

    // Spawn particles
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle(cx, cy));
    }

    let started = Date.now();
    let alive = true;

    const drawParticle = (p: Particle): void => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;

      ctx.fillStyle = p.color;

      if (p.shape === 0) {
        // Diamond
        ctx.beginPath();
        ctx.moveTo(0, -p.height / 2);
        ctx.lineTo(p.width / 2, 0);
        ctx.lineTo(0, p.height / 2);
        ctx.lineTo(-p.width / 2, 0);
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === 1) {
        // Rectangle
        ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
      } else {
        // Circle
        ctx.beginPath();
        ctx.arc(0, 0, p.width / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    const tick = (): void => {
      if (!alive) return;

      const elapsed = Date.now() - started;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let activeCount = 0;

      for (const p of particles) {
        p.age++;
        if (p.age > p.ttl) continue;
        activeCount++;

        p.vy += p.gravity;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Fade out in the last 30% of life
        const fadeStart = p.ttl * 0.7;
        if (p.age > fadeStart) {
          p.opacity = Math.max(0, 1 - (p.age - fadeStart) / (p.ttl - fadeStart));
        }

        drawParticle(p);
      }

      if (activeCount === 0 || elapsed > duration) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onComplete?.();
        return;
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [active, settings.animationsEnabled, particleCount, duration, createParticle, onComplete]);

  if (!active || !settings.animationsEnabled) return null;

  return (
    <canvas
      ref={canvasRef}
      data-testid="confetti-canvas"
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        pointerEvents: "none",
        width: "100vw",
        height: "100vh",
      }}
    />
  );
}
