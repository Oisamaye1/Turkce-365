import Link from "next/link";
import { IconArrow } from "../icons";

/** Title block for pages inside Practice / Learn / Read, with a way back to the hub. */
export function PracticeHeader({ title, tr, lede, back = { href: "/practice", label: "Practice" } }: { title: string; tr: string; lede?: string; back?: { href: string; label: string } }) {
  return (
    <header className="mb-10">
      <Link href={back.href} className="btn-quiet -ml-2 mb-4">
        <IconArrow size={16} className="rotate-180" /> {back.label}
      </Link>
      <h1 className="font-display text-[33px] leading-tight font-semibold sm:text-[42px]">
        {title}{" "}
        <span className="ml-1 align-middle text-[17px] font-normal text-muted" lang="tr">
          {tr}
        </span>
      </h1>
      {lede ? <p className="mt-2 max-w-[62ch] text-[17px] text-ink-soft">{lede}</p> : null}
    </header>
  );
}
