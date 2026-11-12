/** Two-tone icon set (stroke = currentColor, fills from the palette). */
type P = { className?: string; size?: number };

const S = ({ size = 28, className = "", children }: P & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
    {children}
  </svg>
);

export const IconPath = (p: P) => (
  <S {...p}>
    <circle cx="10" cy="7" r="4.5" fill="var(--kobalt)" />
    <circle cx="22" cy="16" r="4.5" fill="var(--turkuaz)" />
    <circle cx="10" cy="25" r="4.5" fill="var(--cay)" />
    <path d="M13 10l5 3M18 19l-5 3" stroke="var(--muted)" strokeWidth="2.2" strokeLinecap="round" />
  </S>
);

export const IconCards = (p: P) => (
  <S {...p}>
    <rect x="9" y="4" width="17" height="21" rx="4" fill="var(--turkuaz)" transform="rotate(10 17 14)" />
    <rect x="6" y="7" width="17" height="21" rx="4" fill="var(--kobalt)" />
    <path d="M11 14h7M11 19h5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
  </S>
);

export const IconBlocks = (p: P) => (
  <S {...p}>
    <rect x="3" y="11" width="9" height="10" rx="3" fill="var(--kobalt)" />
    <rect x="12" y="11" width="8" height="10" rx="3" fill="var(--turkuaz)" />
    <rect x="20" y="11" width="9" height="10" rx="3" fill="var(--cay)" />
    <path d="M12 16h0M20 16h0" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
  </S>
);

export const IconPencil = (p: P) => (
  <S {...p}>
    <path d="M6 26l2-7L21 6l5 5-13 13z" fill="var(--cay)" />
    <path d="M21 6l5 5 1.5-1.5a2.5 2.5 0 000-3.5L26 4.5a2.5 2.5 0 00-3.5 0z" fill="var(--nar)" />
    <path d="M6 26l2-7 5 5z" fill="var(--ink-soft)" />
  </S>
);

export const IconFlag = (p: P) => (
  <S {...p}>
    <path d="M8 4v25" stroke="var(--ink-soft)" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M9 5h15l-3.5 5L24 15H9z" fill="var(--nar)" />
    <circle cx="16" cy="10" r="2.2" fill="#fff" />
  </S>
);

export const IconChart = (p: P) => (
  <S {...p}>
    <rect x="5" y="16" width="5.5" height="11" rx="2" fill="var(--turkuaz)" />
    <rect x="13.25" y="10" width="5.5" height="17" rx="2" fill="var(--kobalt)" />
    <rect x="21.5" y="5" width="5.5" height="22" rx="2" fill="var(--cay)" />
  </S>
);

export const IconLetters = (p: P) => (
  <S {...p}>
    <rect x="3" y="5" width="26" height="22" rx="6" fill="var(--kobalt-tint)" />
    <text x="16" y="22" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="15" fill="var(--kobalt)">
      Çş
    </text>
  </S>
);

export const IconGear = (p: P) => (
  <S {...p}>
    <path
      d="M16 3l2.6 3.2 4-.9.9 4 3.6 2-1.6 3.7 1.6 3.7-3.6 2-.9 4-4-.9L16 29l-2.6-3.2-4 .9-.9-4-3.6-2 1.6-3.7L4.9 12.3l3.6-2 .9-4 4 .9z"
      fill="var(--muted)"
    />
    <circle cx="16" cy="16" r="4.5" fill="var(--paper)" />
  </S>
);

export const IconFlame = ({ lit = true, ...p }: P & { lit?: boolean }) => (
  <S {...p}>
    <path d="M16 3c1 5 8 8 8 15a8 8 0 01-16 0c0-4 2-6 3.5-7.5C12 13 13 15 14 15c0-4 1-8 2-12z" fill={lit ? "var(--cay)" : "var(--locked)"} />
    <path d="M16 15c.6 2.6 4 4 4 7.5a4 4 0 01-8 0c0-2.5 2.6-4 4-7.5z" fill={lit ? "#fff3c4" : "var(--paper)"} />
  </S>
);

export const IconStack = (p: P) => (
  <S {...p}>
    <rect x="6" y="5" width="20" height="24" rx="5" fill="var(--turkuaz)" />
    <rect x="6" y="3" width="20" height="22" rx="5" fill="var(--turkuaz-tint)" stroke="var(--turkuaz)" strokeWidth="2" />
    <path d="M11 11h10M11 16h7" stroke="var(--turkuaz-depth)" strokeWidth="2.4" strokeLinecap="round" />
  </S>
);

export const IconChat = (p: P) => (
  <S {...p}>
    <path d="M5 8a4 4 0 014-4h14a4 4 0 014 4v9a4 4 0 01-4 4h-9l-6 5v-5H9a4 4 0 01-4-4z" fill="currentColor" />
    <circle cx="11.5" cy="12.5" r="1.8" fill="#fff" />
    <circle cx="16" cy="12.5" r="1.8" fill="#fff" />
    <circle cx="20.5" cy="12.5" r="1.8" fill="#fff" />
  </S>
);

export const IconSpark = (p: P) => (
  <S {...p}>
    <path d="M16 3l3 9.5L28 16l-9 3.5L16 29l-3-9.5L4 16l9-3.5z" fill="currentColor" />
  </S>
);

export const IconPen = (p: P) => (
  <S {...p}>
    <path d="M7 25l1.6-6L21 6.6l4.4 4.4L13 23.4z" fill="currentColor" />
    <path d="M6 28h20" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
  </S>
);

export const IconKey = (p: P) => (
  <S {...p}>
    <rect x="4" y="9" width="10" height="14" rx="3" fill="currentColor" />
    <rect x="14" y="9" width="8" height="14" rx="3" fill="currentColor" opacity=".7" />
    <rect x="22" y="9" width="6" height="14" rx="3" fill="currentColor" opacity=".45" />
  </S>
);

export const IconTrophy = (p: P) => (
  <S {...p}>
    <path d="M9 4h14v7a7 7 0 01-14 0z" fill="currentColor" />
    <path d="M9 7H5a4 4 0 004 5M23 7h4a4 4 0 01-4 5" stroke="currentColor" strokeWidth="2.4" fill="none" />
    <path d="M13 22h6l1 4h-8z" fill="currentColor" />
    <path d="M16 17v5" stroke="currentColor" strokeWidth="2.6" />
  </S>
);

export const IconCheck = (p: P) => (
  <S {...p}>
    <path d="M7 16.5l6 6L25 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </S>
);

export const IconX = (p: P) => (
  <S {...p}>
    <path d="M9 9l14 14M23 9L9 23" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
  </S>
);

export const IconLock = (p: P) => (
  <S {...p}>
    <rect x="7" y="14" width="18" height="14" rx="4" fill="currentColor" />
    <path d="M11 14v-3a5 5 0 0110 0v3" stroke="currentColor" strokeWidth="3" fill="none" />
  </S>
);

export const IconSpeaker = (p: P) => (
  <S {...p}>
    <path d="M5 12h5l7-6v20l-7-6H5z" fill="currentColor" />
    <path d="M21 11a6 6 0 010 10M24 7.5a11 11 0 010 17" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" />
  </S>
);

export const IconTurtle = (p: P) => (
  <S {...p}>
    <ellipse cx="15" cy="18" rx="9" ry="6.5" fill="currentColor" />
    <circle cx="26" cy="16" r="3" fill="currentColor" />
    <path d="M9 23l-1.5 3M20 23l1.5 3" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
  </S>
);

export const IconBook = (p: P) => (
  <S {...p}>
    <path d="M4 7c4-2 8-2 12 1v19c-4-3-8-3-12-1z" fill="currentColor" opacity=".75" />
    <path d="M28 7c-4-2-8-2-12 1v19c4-3 8-3 12-1z" fill="currentColor" />
  </S>
);

export const IconTarget = (p: P) => (
  <S {...p}>
    <circle cx="16" cy="16" r="12" fill="var(--nar)" />
    <circle cx="16" cy="16" r="8" fill="#fff" />
    <circle cx="16" cy="16" r="4" fill="var(--nar)" />
  </S>
);
