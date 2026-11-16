"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBlocks, IconCards, IconChart, IconFlag, IconFlame, IconGear, IconLetters, IconPencil, IconSun } from "./icons";
import { ThemeToggle } from "./theme";

export const NAV = [
  { href: "/", en: "Today", tr: "Bugün", Icon: IconSun },
  { href: "/review", en: "Review", tr: "Tekrar", Icon: IconCards },
  { href: "/gym", en: "Suffixes", tr: "Ekler", Icon: IconBlocks },
  { href: "/write", en: "Write", tr: "Yaz", Icon: IconPencil },
  { href: "/missions", en: "Missions", tr: "Görevler", Icon: IconFlag },
  { href: "/progress", en: "Progress", tr: "İlerleme", Icon: IconChart },
  { href: "/alphabet", en: "Alphabet", tr: "Alfabe", Icon: IconLetters },
  { href: "/settings", en: "Settings", tr: "Ayarlar", Icon: IconGear },
];

/** Routes that run full-screen with no navigation, so the exercise has your full attention. */
const FOCUS = ["/review", "/lesson", "/login"];

export function Wordmark() {
  return (
    <span className="font-display text-[21px] font-semibold tracking-tight text-ink">
      Türkçe<span className="text-accent">365</span>
    </span>
  );
}

export function AppShell({ streak, due, children }: { streak: number; due: number; children: React.ReactNode }) {
  const path = usePathname();
  const focus = FOCUS.some((f) => path === f || path.startsWith(`${f}/`));
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  if (focus) return <>{children}</>;

  return (
    <div className="min-h-dvh lg:pl-60">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-paper px-3 py-6 lg:flex">
        <Link href="/" className="mb-8 px-3">
          <Wordmark />
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5" aria-label="Main">
          {NAV.map(({ href, en, tr, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] ${
                active(href) ? "bg-haze font-medium text-ink" : "text-ink-soft hover:bg-haze hover:text-ink"
              }`}
            >
              <Icon size={19} className={active(href) ? "text-brand-text" : ""} />
              <span className="flex-1">{en}</span>
              <span className="text-[12px] text-muted opacity-0 transition-opacity group-hover:opacity-100" lang="tr">
                {tr}
              </span>
            </Link>
          ))}
        </nav>
        <div className="space-y-1 border-t border-line pt-4">
          <div className="flex items-center gap-4 px-3 pb-2 text-[14px] text-ink-soft tabular">
            <span className="flex items-center gap-1.5" title="Day streak">
              <IconFlame size={17} className={streak ? "text-accent" : "text-muted"} />
              {streak} days
            </span>
            <span className="flex items-center gap-1.5" title="Reviews waiting">
              <IconCards size={17} className="text-muted" />
              {due} due
            </span>
          </div>
          <ThemeToggle withLabel />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-3 text-[14px] text-ink-soft tabular">
          <span className="flex items-center gap-1" aria-label={`${streak}-day streak`}>
            <IconFlame size={17} className={streak ? "text-accent" : "text-muted"} />
            {streak}
          </span>
          <Link href="/review" className="flex items-center gap-1" aria-label={`${due} reviews waiting`}>
            <IconCards size={17} />
            {due}
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1080px] px-4 pt-6 pb-28 sm:px-8 lg:pt-12 lg:pb-16">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Main">
        {[...NAV.slice(0, 4), NAV[5]].map(({ href, en, Icon }) => {
          const on = active(href) || (href === "/progress" && ["/missions", "/alphabet", "/settings"].some((h) => path.startsWith(h)));
          return (
            <Link key={href} href={href} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${on ? "text-brand-text" : "text-muted"}`}>
              <Icon size={21} />
              {href === "/progress" ? "More" : en}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** Secondary pages on phones (Missions / Progress / Alphabet / Settings). */
export function MoreTabs() {
  const path = usePathname();
  return (
    <div className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-line px-4 lg:hidden [scrollbar-width:none]">
      {NAV.slice(4).map(({ href, en }) => (
        <Link
          key={href}
          href={href}
          className={`shrink-0 border-b-2 px-3 py-2.5 text-[15px] ${path.startsWith(href) ? "border-accent font-medium text-ink" : "border-transparent text-ink-soft"}`}
        >
          {en}
        </Link>
      ))}
    </div>
  );
}
