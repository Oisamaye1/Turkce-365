"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme";

export const NAV = [
  { href: "/", en: "Today", tr: "Bugün", icon: "🏠" },
  { href: "/lesson", en: "Lesson", tr: "Ders", icon: "📖" },
  { href: "/review", en: "Review", tr: "Tekrar", icon: "🔁" },
  { href: "/gym", en: "Suffix Gym", tr: "Ek Antrenmanı", icon: "🏋️" },
  { href: "/write", en: "Write", tr: "Yaz", icon: "✍️" },
  { href: "/missions", en: "Missions", tr: "Görevler", icon: "🎯" },
  { href: "/progress", en: "Progress", tr: "İlerleme", icon: "📈" },
  { href: "/alphabet", en: "Alphabet", tr: "Alfabe", icon: "🔤" },
  { href: "/settings", en: "Settings", tr: "Ayarlar", icon: "⚙️" },
];

export function Nav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-sm text-accent-fg">365</span>
          <span className="hidden sm:inline">Türkçe 365</span>
        </Link>
        <nav className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm whitespace-nowrap ${
                active(n.href) ? "bg-fg text-bg" : "text-fg hover:bg-card-2"
              }`}
              title={`${n.en} · ${n.tr}`}
            >
              <span aria-hidden>{n.icon}</span>
              <span>{n.en}</span>
              <span className={`hidden lg:inline ${active(n.href) ? "opacity-70" : "text-muted"}`}>· {n.tr}</span>
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}

const TABS = ["/", "/lesson", "/review", "/gym", "/write"];

/** Phone-only bottom tab bar for the five daily screens. */
export function BottomTabs() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <div className="grid grid-cols-5">
        {NAV.filter((n) => TABS.includes(n.href)).map((n) => (
          <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active(n.href) ? "font-semibold text-accent" : "text-muted"}`}>
            <span className="text-lg leading-none" aria-hidden>
              {n.icon}
            </span>
            <span>{n.en === "Suffix Gym" ? "Gym" : n.en}</span>
            <span className="text-[9px] opacity-75">{n.tr === "Ek Antrenmanı" ? "Ekler" : n.tr}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
