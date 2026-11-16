"use client";

import { usePathname } from "next/navigation";

const FOCUS = ["/review", "/lesson", "/login"];

/**
 * Re-mounts on every navigation, so each page arrives the same way. Focus pages only
 * fade: a moving (transformed) wrapper would briefly re-anchor their fixed answer bars.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const focus = FOCUS.some((f) => path === f || path.startsWith(`${f}/`));
  return <div className={focus ? "animate-fade" : "animate-page"}>{children}</div>;
}
