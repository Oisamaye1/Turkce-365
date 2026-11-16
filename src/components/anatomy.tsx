/**
 * Word anatomy — the app's signature device. A Turkish word is shown as its
 * root plus suffixes, each part set apart and optionally labelled underneath.
 *   ev | ler | im | den
 *   house plural my from
 */
export function parseBreakdown(s: string): string[] {
  return s
    .replace(/\(.*?\)/g, "")
    .split(/\s*[+·]\s*/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function WordAnatomy({
  parts,
  labels,
  size = "md",
  className = "",
}: {
  parts: string[];
  labels?: (string | undefined)[];
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const text = { sm: "text-[17px]", md: "text-[21px]", lg: "text-[33px]", xl: "text-[44px] sm:text-[56px]" }[size];
  const pad = { sm: "px-1.5 py-0.5", md: "px-2 py-0.5", lg: "px-3 py-1", xl: "px-3.5 py-1.5" }[size];
  const segs = parts.filter((p) => p !== "·");
  return (
    <span className={`inline-flex flex-wrap items-start gap-[3px] ${className}`} lang="tr">
      {segs.map((p, i) => (
        <span key={i} className="inline-flex flex-col items-start">
          <span
            className={`tr-word leading-none ${text} ${pad} ${
              i === 0 ? "rounded-l-md border-b-2 border-ink bg-haze" : `bg-brand-tint text-brand-text ${i === segs.length - 1 ? "rounded-r-md" : ""}`
            }`}
          >
            {p}
          </span>
          {labels?.[i] ? <span className="mt-1.5 px-1 text-[12px] leading-tight text-muted">{labels[i]}</span> : null}
        </span>
      ))}
    </span>
  );
}
