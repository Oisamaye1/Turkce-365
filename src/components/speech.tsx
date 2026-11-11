"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

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

/** Speaker button — hidden when no Turkish voice is installed. */
export function Speak({ text, slow = false, className = "", label }: { text: string; slow?: boolean; className?: string; label?: string }) {
  const { speak, available } = useSpeech();
  if (!available) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        speak(text, slow ? 0.65 : 0.9);
      }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-card px-2.5 py-1.5 text-sm hover:bg-sea-soft ${className}`}
      aria-label={`Play pronunciation: ${text}`}
      title={slow ? "Play slowly" : "Play"}
    >
      {slow ? "🐢" : "🔊"}
      {label ? <span className="ml-1 text-xs">{label}</span> : null}
    </button>
  );
}
