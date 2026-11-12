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
      className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-muted hover:bg-wash"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        {dark ? (
          <g fill="var(--cay)">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke="var(--cay)" strokeWidth="2" strokeLinecap="round" />
          </g>
        ) : (
          <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" fill="var(--kobalt)" />
        )}
      </svg>
      <span className="hidden lg:inline">{dark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
