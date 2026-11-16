"use client";

import { useEffect, useRef, useState } from "react";

/** Counts up to `value` once on mount (instantly with reduced motion). */
export function CountUp({ value, duration = 700 }: { value: number; duration?: number }) {
  const [n, setN] = useState(value);
  const done = useRef(false);
  useEffect(() => {
    if (done.current) {
      setN(value);
      return;
    }
    done.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || value <= 1) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setN(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className="tabular">{n}</span>;
}
