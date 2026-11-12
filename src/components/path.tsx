import Link from "next/link";
import { IconCheck, IconLock } from "./icons";

export type NodeState = "done" | "current" | "next" | "locked";

export interface PathNode {
  key: string;
  title: string;
  titleTr: string;
  minutes?: number;
  href: string | null;
  state: NodeState;
  icon: React.ReactNode;
  tone: "kobalt" | "turkuaz" | "cay" | "nar" | "zeytin";
  /** Big finishing node (chest/trophy) */
  finish?: boolean;
}

/** Horizontal offsets that make the path snake left and right. */
const OFFSETS = [0, 52, 78, 52, 0, -52, -78, -52];

const TONE: Record<PathNode["tone"], { bg: string; depth: string; text: string }> = {
  kobalt: { bg: "bg-kobalt", depth: "var(--kobalt-depth)", text: "text-kobalt" },
  turkuaz: { bg: "bg-turkuaz", depth: "var(--turkuaz-depth)", text: "text-turkuaz-depth" },
  cay: { bg: "bg-cay", depth: "var(--cay-depth)", text: "text-cay-depth" },
  nar: { bg: "bg-nar", depth: "var(--nar-depth)", text: "text-nar" },
  zeytin: { bg: "bg-zeytin", depth: "var(--zeytin-depth)", text: "text-zeytin-depth" },
};

export function SessionPath({ nodes, aside }: { nodes: PathNode[]; aside?: React.ReactNode }) {
  return (
    <ol className="relative mx-auto flex w-full max-w-sm flex-col items-center gap-7 py-4" aria-label="Today's session">
      {aside}
      {nodes.map((n, i) => {
        const t = TONE[n.tone];
        const coloured = n.state === "done" || n.state === "current";
        const size = n.finish ? "h-[84px] w-[84px]" : "h-[72px] w-[72px]";
        const node = (
          <span
            className={`relative grid ${size} place-items-center rounded-full transition-transform active:translate-y-[6px] ${
              coloured ? `${t.bg} text-white` : n.state === "next" ? "bg-locked text-muted" : "bg-locked text-muted/70"
            }`}
            style={{ boxShadow: `0 7px 0 ${coloured ? t.depth : "var(--locked-depth)"}` }}
          >
            {n.state === "done" && !n.finish ? (
              <IconCheck size={34} />
            ) : n.state === "locked" ? (
              <IconLock size={28} />
            ) : coloured ? (
              n.icon
            ) : (
              <span className="opacity-45 grayscale">{n.icon}</span>
            )}
            {coloured ? <span className="absolute top-2.5 left-4 h-3 w-5 -rotate-[25deg] rounded-full bg-white/30" aria-hidden="true" /> : null}
          </span>
        );
        return (
          <li key={n.key} className="relative flex flex-col items-center" style={{ transform: `translateX(${OFFSETS[i % OFFSETS.length]}px)` }}>
            {n.state === "current" ? (
              <span
                className={`font-display absolute -top-12 left-1/2 z-10 rounded-xl border-2 border-line bg-paper px-3 py-1.5 text-[15px] font-extrabold whitespace-nowrap ${t.text}`}
                style={{ animation: "bob 1.6s ease-in-out infinite" }}
              >
                {n.key === "reviews" ? "Start here" : "Continue"}
                <span className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-r-2 border-b-2 border-line bg-paper" aria-hidden="true" />
              </span>
            ) : null}
            {n.state === "current" ? <span className={`absolute top-[-8px] h-[88px] w-[88px] rounded-full border-[5px] border-locked`} aria-hidden="true" /> : null}
            {n.href && n.state !== "locked" ? (
              <Link href={n.href} aria-label={`${n.title}${n.state === "done" ? " (done)" : ""}`} className="rounded-full">
                {node}
              </Link>
            ) : (
              <span aria-label={`${n.title} (locked)`}>{node}</span>
            )}
            <span className="mt-3.5 text-center leading-tight">
              <span className={`font-display block text-[15px] font-bold ${n.state === "locked" ? "text-muted" : "text-ink"}`}>{n.title}</span>
              <span className="block text-xs text-muted" lang="tr">
                {n.titleTr}
                {n.minutes ? `, ${n.minutes} min` : ""}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
