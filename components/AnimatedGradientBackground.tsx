'use client';

import { useEffect, useRef } from 'react';
import { drawFrame, LOOP_SECONDS } from '@/lib/gradientRenderer';

/**
 * Live canvas version: rotating + hue-cycling gradient field, seamless 30s loop.
 * Speeds up while the page scrolls, eases back when it stops. Zero re-renders.
 * Mount once in layout.tsx; content sits in a wrapper with position:relative; z-index:1.
 */
export default function AnimatedGradientBackground({
  speed = 1,
  scrollBoost = 5,
  parallax = 18,
  grain = 0.42,
}: { speed?: number; scrollBoost?: number; parallax?: number; grain?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      const w = cv.clientWidth || window.innerWidth;
      const h = cv.clientHeight || window.innerHeight;
      const scale = Math.min(1, 1100 / Math.max(w, h)) * Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.round(w * scale);
      cv.height = Math.round(h * scale);
    };
    resize();
    window.addEventListener('resize', resize);

    const scroller = document.scrollingElement || document.documentElement;
    let lastY = scroller.scrollTop;
    let lastT = performance.now();
    let target = 0;
    let boost = 0;
    const onScroll = () => {
      const now = performance.now();
      const dy = Math.abs(scroller.scrollTop - lastY);
      const dt = Math.max(16, now - lastT);
      lastY = scroller.scrollTop;
      lastT = now;
      target = Math.min(scrollBoost, (dy / dt) * 2.2 * (scrollBoost / 5));
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const m = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      m.tx = (e.clientX / window.innerWidth - 0.5) * 2 * parallax;
      m.ty = (e.clientY / window.innerHeight - 0.5) * 2 * parallax;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    let phase = 0;
    let prev = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - prev) / 1000);
      prev = now;
      target *= 0.9;
      boost += (target - boost) * 0.12;
      m.x += (m.tx - m.x) * 0.04;
      m.y += (m.ty - m.y) * 0.04;
      if (!reduced) phase = (phase + (dt / LOOP_SECONDS) * speed * (1 + boost)) % 1;
      const s = cv.width / (cv.clientWidth || 1);
      drawFrame(ctx, cv.width, cv.height, phase, { grain, px: m.x * s, py: m.y * s });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onMove);
    };
  }, [speed, scrollBoost, parallax, grain]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', zIndex: 0, pointerEvents: 'none' }}
    />
  );
}
