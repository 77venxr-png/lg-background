'use client';

import { useEffect, useRef } from 'react';

/**
 * Video-as-background variant (the route you picked).
 * Plays the exported seamless loop at 1x, and raises playbackRate while the page
 * scrolls so the flow accelerates, easing back to 1x when scrolling stops.
 *
 * Export from the Gradient Video Export page, then drop into public/:
 *   gradient-1920x1080.webm   gradient-1080x1920.webm
 */
export default function VideoGradientBackground({
  srcDesktop = '/gradient-1920x1080.webm',
  srcMobile = '/gradient-1080x1920.webm',
  maxRate = 4,
  poster,
}: { srcDesktop?: string; srcMobile?: string; maxRate?: number; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      v.pause();
      return;
    }
    const scroller = document.scrollingElement || document.documentElement;
    let lastY = scroller.scrollTop;
    let lastT = performance.now();
    let target = 1;
    let rate = 1;
    const onScroll = () => {
      const now = performance.now();
      const dy = Math.abs(scroller.scrollTop - lastY);
      const dt = Math.max(16, now - lastT);
      lastY = scroller.scrollTop;
      lastT = now;
      target = Math.min(maxRate, 1 + (dy / dt) * 2.2);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    let raf = 0;
    const tick = () => {
      target += (1 - target) * 0.06;
      rate += (target - rate) * 0.1;
      v.playbackRate = Math.max(0.5, Math.min(maxRate, rate));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, [maxRate]);

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none', background: '#dcc8f2' }}>
      <video ref={ref} autoPlay loop muted playsInline preload="auto" poster={poster}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}>
        <source src={srcMobile} type="video/webm" media="(max-aspect-ratio: 1/1)" />
        <source src={srcDesktop} type="video/webm" />
      </video>
    </div>
  );
}
