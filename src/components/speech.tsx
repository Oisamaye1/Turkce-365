"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { IconSpeaker, IconTurtle } from "./icons";

interface SpeechCtx {
  voices: SpeechSynthesisVoice[];
  voice: SpeechSynthesisVoice | null;
  setVoiceURI: (uri: string) => void;
  speak: (text: string, rate?: number) => void;
  available: boolean;
}

const Ctx = createContext<SpeechCtx>({ voices: [], voice: null, setVoiceURI: () => {}, speak: () => {}, available: false });

const STORAGE_KEY = "turkce365.voice";

export function VoiceProvider({ initialVoiceURI, children }: { initialVoiceURI?: string | null; children: React.ReactNode }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [uri, setUri] = useState<string | null>(initialVoiceURI ?? null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setUri(saved);
    } catch {}
    const load = () => setVoices(window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("tr")));
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const voice = useMemo(() => voices.find((v) => v.voiceURI === uri) ?? voices[0] ?? null, [voices, uri]);

  const speak = useCallback(
    (text: string, rate = 0.9) => {
      if (!voice || typeof window === "undefined") return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = rate;
      window.speechSynthesis.speak(u);
    },
    [voice],
  );

  const setVoiceURI = useCallback((v: string) => {
    setUri(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {}
  }, []);

  return <Ctx.Provider value={{ voices, voice, setVoiceURI, speak, available: !!voice }}>{children}</Ctx.Provider>;
}

export const useSpeech = () => useContext(Ctx);

/** Round speaker button (Duolingo-style) — hidden when no Turkish voice is installed. */
export function Speak({
  text,
  slow = false,
  className = "",
  size = "md",
}: {
  text: string;
  slow?: boolean;
  className?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { speak, available } = useSpeech();
  if (!available) return null;
  const dim = size === "lg" ? "h-16 w-16" : size === "sm" ? "h-8 w-8" : "h-11 w-11";
  const icon = size === "lg" ? 34 : size === "sm" ? 18 : 24;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        speak(text, slow ? 0.6 : 0.9);
      }}
      className={`grid shrink-0 place-items-center rounded-2xl ${dim} ${
        slow ? "bg-turkuaz-tint text-turkuaz-depth" : "bg-turkuaz text-white shadow-[0_4px_0_var(--turkuaz-depth)] active:translate-y-1 active:shadow-none"
      } ${className}`}
      aria-label={slow ? `Play slowly: ${text}` : `Play: ${text}`}
    >
      {slow ? <IconTurtle size={icon} /> : <IconSpeaker size={icon} />}
    </button>
  );
}
