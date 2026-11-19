/** The practice games, in the order the hub shows them. */
export const GAMES = [
  {
    id: "match",
    title: "Match pairs",
    tr: "Eşleştir",
    sample: ["merhaba", "hello"],
    blurb: "Pair Turkish words with their meanings, against the clock.",
    how: "Three boards of six pairs. Tap a Turkish word, then its meaning. Faster and fewer mistakes means more points.",
  },
  {
    id: "harmony",
    title: "Harmony hunter",
    tr: "Ünlü uyumu",
    sample: ["ev", "evlerde"],
    blurb: "Pick the ending that matches the word's vowels.",
    how: "Each word needs an ending. Look at its last vowel, pick the form that matches. Streaks earn bonus points.",
  },
  {
    id: "numbers",
    title: "Numbers",
    tr: "Sayılar",
    sample: ["47", "kırk yedi"],
    blurb: "From sıfır to on bin: read and say numbers fast.",
    how: "Switch between digits and words. Pick how big the numbers get.",
  },
  {
    id: "clock",
    title: "What time is it?",
    tr: "Saat kaç?",
    sample: ["3:15", "üçü çeyrek geçiyor"],
    blurb: "Tell the time the way people say it: buçuk, çeyrek, geçiyor, var.",
    how: "Read the clock and choose how a Turkish speaker would say it.",
  },
  {
    id: "listen",
    title: "Listen and pick",
    tr: "Dinle",
    sample: ["♪", "günaydın"],
    blurb: "Hear a word, find it. Trains your ear for Turkish sounds.",
    how: "The word plays out loud. Pick the one you heard. Replay it, or slow it down, as often as you like.",
  },
  {
    id: "lightning",
    title: "Lightning round",
    tr: "Şimşek turu",
    sample: ["60", "seconds"],
    blurb: "Sixty seconds, as many meanings as you can.",
    how: "A Turkish word appears; tap its meaning. Wrong answers cost time, not points.",
  },
] as const;

export type GameId = (typeof GAMES)[number]["id"];
