/** Line icons: 24px grid, 1.75 stroke, currentColor. */
type P = { className?: string; size?: number };

const S = ({ size = 20, className = "", children }: P & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

/** Today / learn: a sunrise over the sea. */
export const IconSun = (p: P) => (
  <S {...p}>
    <path d="M4 18h16M7 21h10" />
    <path d="M7.5 15a4.5 4.5 0 019 0" />
    <path d="M12 3v3M4.9 7.9l2 2M19.1 7.9l-2 2" />
  </S>
);

export const IconCards = (p: P) => (
  <S {...p}>
    <rect x="3.5" y="6" width="13" height="15" rx="2" />
    <path d="M7.5 3h11a2 2 0 012 2v12" />
  </S>
);

export const IconBlocks = (p: P) => (
  <S {...p}>
    <rect x="2.5" y="8" width="7" height="8" rx="1.5" />
    <rect x="9.5" y="8" width="5" height="8" rx="1.5" />
    <rect x="14.5" y="8" width="7" height="8" rx="1.5" />
  </S>
);

export const IconPencil = (p: P) => (
  <S {...p}>
    <path d="M14.5 5.5l4 4L8 20H4v-4z" />
    <path d="M13 7l4 4" />
  </S>
);

export const IconFlag = (p: P) => (
  <S {...p}>
    <path d="M5 21V4" />
    <path d="M5 4h11l-2 4 2 4H5" />
  </S>
);

export const IconChart = (p: P) => (
  <S {...p}>
    <path d="M4 20h16" />
    <path d="M7 16v-4M12 16V7M17 16v-7" />
  </S>
);

export const IconLetters = (p: P) => (
  <S {...p}>
    <path d="M3 18l4.5-12L12 18M4.6 14h5.8" />
    <path d="M15 12.5a3 3 0 115.6 1.5L15 18h6" />
  </S>
);

export const IconGear = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
  </S>
);

export const IconFlame = (p: P) => (
  <S {...p}>
    <path d="M12 21a6 6 0 006-6c0-4-3-6-4-9-2 2-2.5 4-2 6-1.5-.5-2.5-2-2.5-3.5C7.5 10 6 12.5 6 15a6 6 0 006 6z" />
  </S>
);

export const IconChat = (p: P) => (
  <S {...p}>
    <path d="M4 5h16v11H9l-5 4z" />
  </S>
);

export const IconSpark = (p: P) => (
  <S {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />
  </S>
);

export const IconCheck = (p: P) => (
  <S {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </S>
);

export const IconX = (p: P) => (
  <S {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </S>
);

export const IconLock = (p: P) => (
  <S {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 018 0v3" />
  </S>
);

export const IconSpeaker = (p: P) => (
  <S {...p}>
    <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
    <path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" />
  </S>
);

export const IconSlow = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="13" r="7" />
    <path d="M12 9v4l2.5 1.5M10 3h4" />
  </S>
);

export const IconBook = (p: P) => (
  <S {...p}>
    <path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5V19c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z" />
    <path d="M12 6v13.5" />
  </S>
);

export const IconArrow = (p: P) => (
  <S {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </S>
);

export const IconMoon = (p: P) => (
  <S {...p}>
    <path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" />
  </S>
);

export const IconSunSmall = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </S>
);

/** Plan: a winding route with a start and a goal. */
export const IconRoute = (p: P) => (
  <S {...p}>
    <circle cx="6" cy="19" r="2" />
    <path d="M8 19h8.5a3.5 3.5 0 000-7h-9a3.5 3.5 0 010-7H16" />
    <path d="M16 2.5l2.5 2.5L16 7.5" />
  </S>
);

/** Tiny challenge: a small target. */
export const IconTarget = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" />
  </S>
);

export const IconChevron = (p: P) => (
  <S {...p}>
    <path d="M9 6l6 6-6 6" />
  </S>
);

/** Admin: a shield. */
export const IconShield = (p: P) => (
  <S {...p}>
    <path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6L12 3z" />
    <path d="M9 12l2 2 4-4" />
  </S>
);

export const IconUser = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="8.5" r="3.75" />
    <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
  </S>
);

export const IconCopy = (p: P) => (
  <S {...p}>
    <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
    <path d="M15.5 8.5V5.5a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2h3" />
  </S>
);

/** Read: an open book. */
export const IconOpenBook = (p: P) => (
  <S {...p}>
    <path d="M3 5.5c3-.9 6-.6 9 1.2v13c-3-1.8-6-2.1-9-1.2v-13z" />
    <path d="M21 5.5c-3-.9-6-.6-9 1.2v13c3-1.8 6-2.1 9-1.2v-13z" />
  </S>
);

/** Practice: a game controller. */
export const IconPlay = (p: P) => (
  <S {...p}>
    <path d="M7 8h10a4.5 4.5 0 014.4 5.4l-.7 3.4a2.3 2.3 0 01-4 1L15 16H9l-1.7 1.8a2.3 2.3 0 01-4-1l-.7-3.4A4.5 4.5 0 017 8z" />
    <path d="M8 11v3M6.5 12.5h3M15.5 12h.01M17.5 13.5h.01" />
  </S>
);
