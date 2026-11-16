"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSunSmall } from "./icons";

/** Runs before paint (inlined in <head>) to avoid a light flash in dark mode. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('turkce365.theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
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
      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] text-ink-soft hover:bg-haze hover:text-ink"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {dark ? <IconSunSmall size={18} /> : <IconMoon size={18} />}
      {withLabel ? <span>{dark ? "Light theme" : "Dark theme"}</span> : null}
    </button>
  );
}
