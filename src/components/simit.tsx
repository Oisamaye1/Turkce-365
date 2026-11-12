/**
 * Simit — a Cyprus street cat (ginger tabby, like the ones in every Lefkoşa café).
 * Pure SVG so it stays crisp and works offline.
 */
export type Mood = "happy" | "calm" | "oops" | "proud";

export function Simit({ mood = "calm", size = 120, className = "" }: { mood?: Mood; size?: number; className?: string }) {
  const eyes =
    mood === "happy" || mood === "proud" ? (
      <>
        <path d="M44 62q6-7 12 0" stroke="#22304d" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M74 62q6-7 12 0" stroke="#22304d" strokeWidth="4" strokeLinecap="round" fill="none" />
      </>
    ) : mood === "oops" ? (
      <>
        <circle cx="50" cy="61" r="5.5" fill="#22304d" />
        <circle cx="80" cy="61" r="5.5" fill="#22304d" />
        <path d="M42 53l11-4M88 53l-11-4" stroke="#22304d" strokeWidth="3.5" strokeLinecap="round" />
      </>
    ) : (
      <>
        <ellipse cx="50" cy="61" rx="5.5" ry="7" fill="#22304d" />
        <ellipse cx="80" cy="61" rx="5.5" ry="7" fill="#22304d" />
        <circle cx="52" cy="58" r="2" fill="#fff" />
        <circle cx="82" cy="58" r="2" fill="#fff" />
      </>
    );
  const mouth =
    mood === "oops" ? (
      <path d="M58 82q7-5 14 0" stroke="#22304d" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    ) : (
      <path d="M57 78q8 8 16 0" stroke="#22304d" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    );
  return (
    <svg width={size} height={size} viewBox="0 0 130 130" className={className} role="img" aria-label="Simit the cat">
      {/* tail */}
      <path d="M100 112q24-6 18-30" stroke="#f08a1c" strokeWidth="11" strokeLinecap="round" fill="none" />
      {/* body */}
      <ellipse cx="65" cy="108" rx="34" ry="18" fill="#ffae33" />
      {/* ears */}
      <path d="M26 46L30 12l26 20z" fill="#ffae33" />
      <path d="M104 46l-4-34-26 20z" fill="#ffae33" />
      <path d="M33 38l2-17 13 10z" fill="#ffc9b5" />
      <path d="M97 38l-2-17-13 10z" fill="#ffc9b5" />
      {/* head */}
      <ellipse cx="65" cy="66" rx="44" ry="38" fill="#ffae33" />
      {/* tabby stripes */}
      <path d="M57 30q8 10 0 18M73 30q-8 10 0 18M65 28v18" stroke="#f08a1c" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M22 66h12M22 76h11M108 66H96M108 76H97" stroke="#f08a1c" strokeWidth="4.5" strokeLinecap="round" />
      {/* muzzle */}
      <ellipse cx="65" cy="80" rx="18" ry="13" fill="#fff4e2" />
      <path d="M60 72h10l-5 5z" fill="#ee4462" />
      {eyes}
      {mouth}
      {/* cheeks */}
      <circle cx="38" cy="78" r="5" fill="#ff8a8a" opacity=".45" />
      <circle cx="92" cy="78" r="5" fill="#ff8a8a" opacity=".45" />
      {mood === "proud" ? (
        // a tiny çay glass
        <g transform="translate(92 92)">
          <path d="M2 0h16l-2 20H4z" fill="#ffffff" opacity=".85" stroke="#c6d0e4" strokeWidth="1.5" />
          <path d="M3.5 7h13l-1.3 12H4.8z" fill="#c8481b" />
        </g>
      ) : null}
    </svg>
  );
}
