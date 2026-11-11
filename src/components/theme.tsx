"use client";

import { useEffect, useState } from "react";

/** Runs before paint (inlined in <head>) to avoid a light flash in dark mode. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('turkce365.theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("turkce365.theme", next ? "dark" : "light");
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1.5 text-sm"
      aria-label="Toggle dark mode"
      title="Dark mode · Karanlık mod"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
