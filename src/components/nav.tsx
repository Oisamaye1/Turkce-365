"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBlocks, IconCards, IconChart, IconFlag, IconFlame, IconGear, IconLetters, IconPath, IconPencil } from "./icons";
import { ThemeToggle } from "./theme";

export const NAV = [
  { href: "/", en: "Learn", tr: "Öğren", Icon: IconPath },
  { href: "/review", en: "Review", tr: "Tekrar", Icon: IconCards },
  { href: "/gym", en: "Suffix gym", tr: "Ekler", Icon: IconBlocks },
  { href: "/write", en: "Write", tr: "Yaz", Icon: IconPencil },
  { href: "/missions", en: "Missions", tr: "Görevler", Icon: IconFlag },
  { href: "/progress", en: "Progress", tr: "İlerleme", Icon: IconChart },
  { href: "/alphabet", en: "Alphabet", tr: "Alfabe", Icon: IconLetters },
  { href: "/settings", en: "Settings", tr: "Ayarlar", Icon: IconGear },
];

/** Routes that run full-screen (no navigation chrome), like a Duolingo lesson. */
const FOCUS = ["/review", "/lesson", "/login"];

export function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <span className={`font-display font-extrabold tracking-tight text-kobalt ${small ? "text-2xl" : "text-[28px]"}`}>
      türkçe<span className="text-cay">365</span>
    </span>
  );
}

export function AppShell({ streak, due, children }: { streak: number; due: number; children: React.ReactNode }) {
  const path = usePathname();
  const focus = FOCUS.some((f) => path === f || path.startsWith(`${f}/`));
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  if (focus) return <>{children}</>;

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r-2 border-line bg-paper px-4 py-6 lg:flex">
        <Link href="/" className="mb-6 px-3">
          <Wordmark />
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, en, tr, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3.5 rounded-2xl border-2 px-3 py-2 ${
                active(href) ? "border-kobalt/40 bg-kobalt-tint" : "border-transparent hover:bg-wash"
              }`}
            >
              <Icon size={30} />
              <span className="leading-tight">
                <span className={`font-display block text-[17px] font-bold ${active(href) ? "text-kobalt" : "text-ink-soft"}`}>{en}</span>
                <span className="block text-xs text-muted">{tr}</span>
              </span>
            </Link>
          ))}
        </nav>
        <div className="px-3">
          <ThemeToggle />
        </div>
      </aside>

      {/* Phone top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b-2 border-line bg-paper/95 px-4 py-2 backdrop-blur lg:hidden">
        <Link href="/">
          <Wordmark small />
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/progress" className="flex items-center gap-1 rounded-xl px-2 py-1 font-display text-lg font-extrabold text-cay-depth" aria-label={`${streak}-day streak`}>
            <IconFlame size={24} lit={streak > 0} />
            {streak}
          </Link>
          <Link href="/review" className="flex items-center gap-1 rounded-xl px-2 py-1 font-display text-lg font-extrabold text-turkuaz-depth" aria-label={`${due} reviews waiting`}>
            <IconCards size={24} />
            {due}
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pt-5 pb-28 sm:px-6 lg:pt-8 lg:pb-12">{children}</main>

      {/* Phone bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t-2 border-line bg-paper pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV.slice(0, 4).map(({ href, en, Icon }) => (
          <Link key={href} href={href} className="flex flex-col items-center gap-0.5 py-2" aria-label={en}>
            <span className={`rounded-xl border-2 p-1 ${active(href) ? "border-kobalt/40 bg-kobalt-tint" : "border-transparent"}`}>
              <Icon size={26} />
            </span>
          </Link>
        ))}
        <Link href="/missions" className="flex flex-col items-center gap-0.5 py-2" aria-label="More">
          <span
            className={`rounded-xl border-2 p-1 ${
              ["/missions", "/progress", "/alphabet", "/settings"].some((h) => path.startsWith(h)) ? "border-kobalt/40 bg-kobalt-tint" : "border-transparent"
            }`}
          >
            <IconFlag size={26} />
          </span>
        </Link>
      </nav>
    </div>
  );
}

/** Secondary links for phones (Missions / Progress / Alphabet / Settings) shown at the top of those pages. */
export function MoreTabs() {
  const path = usePathname();
  return (
    <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden [scrollbar-width:none]">
      {NAV.slice(4).map(({ href, en, Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex shrink-0 items-center gap-2 rounded-2xl border-2 px-3 py-1.5 font-display font-bold ${
            path.startsWith(href) ? "border-kobalt/40 bg-kobalt-tint text-kobalt" : "border-line text-ink-soft"
          }`}
        >
          <Icon size={22} />
          {en}
        </Link>
      ))}
    </div>
  );
}
