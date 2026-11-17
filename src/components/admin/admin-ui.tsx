"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { IconCheck, IconCopy } from "../icons";

const TABS = [
  { href: "/admin", en: "Learners" },
  { href: "/admin/codes", en: "Signup codes" },
  { href: "/admin/activity", en: "Activity" },
];

export function AdminTabs() {
  const path = usePathname();
  const on = (h: string) => (h === "/admin" ? path === "/admin" || path.startsWith("/admin/users") : path.startsWith(h));
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]" aria-label="Admin sections">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={on(t.href) ? "page" : undefined}
          className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-[15px] transition-colors ${on(t.href) ? "border-accent font-medium text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}
        >
          {t.en}
        </Link>
      ))}
    </nav>
  );
}

/** Copy text with a short confirmation. */
export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[14px] font-medium transition-colors ${copied ? "text-ok-text" : "text-brand-text hover:bg-brand-tint"} ${className}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? <IconCheck size={15} className="animate-pop" /> : <IconCopy size={15} />}
      {copied ? "Copied" : label}
    </button>
  );
}
