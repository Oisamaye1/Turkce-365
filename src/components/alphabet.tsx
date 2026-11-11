"use client";

import { useEffect, useState } from "react";
import { ALPHABET, SPELL_WORDS, VOWEL_GROUPS } from "@/lib/alphabet";
import { Speak, useSpeech } from "./speech";
import { TypeAnswer } from "./type-answer";

export function AlphabetModule() {
  const { speak, available } = useSpeech();
  const [sel, setSel] = useState(ALPHABET.findIndex((l) => l.lower === "ç"));
  const [onlySpecial, setOnlySpecial] = useState(false);
  const letter = ALPHABET[sel];
  const letters = onlySpecial ? ALPHABET.filter((l) => l.special) : ALPHABET;

  return (
    <div className="space-y-5">
      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">
            29 letters <span className="label-tr">· 29 harf</span>
          </h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlySpecial} onChange={(e) => setOnlySpecial(e.target.checked)} />
            Only letters that differ from English
          </label>
        </div>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
          {letters.map((l) => {
            const idx = ALPHABET.indexOf(l);
            return (
              <button
                key={l.upper}
                onClick={() => {
                  setSel(idx);
                  speak(l.example);
                }}
                className={`rounded-xl border py-2 text-center text-xl font-bold ${
                  idx === sel ? "border-fg bg-fg text-bg" : l.special ? "border-accent bg-accent-soft text-accent" : "border-border bg-card hover:bg-card-2"
                }`}
              >
                {l.upper}
                <span className="font-normal">{l.lower}</span>
              </button>
            );
          })}
        </div>
        <div className="grid gap-4 rounded-2xl bg-card-2 p-4 sm:grid-cols-[auto_1fr]">
          <div className="text-6xl font-bold">
            {letter.upper}
            {letter.lower}
          </div>
          <div className="space-y-1.5">
            <div className="text-sm text-muted">name: “{letter.name}”</div>
            <div className="text-lg">{letter.sound}</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-semibold">{letter.example}</span>
              <span className="text-muted">— {letter.exampleEn}</span>
              <Speak text={letter.example} />
              <Speak text={letter.example} slow />
            </div>
            {letter.tip ? <p className="text-sm">💡 {letter.tip}</p> : null}
          </div>
        </div>
        <div className="rounded-xl border border-border p-3 text-sm">
          <b>Dotted vs undotted:</b> <span className="font-mono">İ i</span> (as in <i>iyi</i>, <i>İskele</i>) and <span className="font-mono">I ı</span> (as in <i>ılık</i>, <i>Iğdır</i>) are two different letters. Lower-case “I” is “ı”, upper-case “i” is “İ” — the app always uses Turkish casing.
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">
          Vowel harmony <span className="label-tr">· Ünlü uyumu</span>
        </h2>
        <p className="text-sm">Suffix vowels copy the last vowel of the word. Learn these two groups now — every suffix depends on them.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-card-2 p-3">
            <div className="text-xs text-muted">2-way (a / e)</div>
            <div className="mt-1">
              back <b className="font-mono">{VOWEL_GROUPS.back.join(" ")}</b> → <b>a</b> &nbsp; (okul<b>da</b>, kitap<b>lar</b>)
            </div>
            <div>
              front <b className="font-mono">{VOWEL_GROUPS.front.join(" ")}</b> → <b>e</b> &nbsp; (ev<b>de</b>, göz<b>ler</b>)
            </div>
          </div>
          <div className="rounded-xl bg-card-2 p-3">
            <div className="text-xs text-muted">4-way (ı / i / u / ü)</div>
            <div className="mt-1 grid grid-cols-2 gap-x-3 font-mono text-sm">
              <span>a, ı → ı</span>
              <span>kız<b>ı</b></span>
              <span>e, i → i</span>
              <span>ev<b>i</b></span>
              <span>o, u → u</span>
              <span>okul<b>u</b></span>
              <span>ö, ü → ü</span>
              <span>göz<b>ü</b></span>
            </div>
          </div>
        </div>
      </section>

      <SpellDrill available={available} />
    </div>
  );
}

function SpellDrill({ available }: { available: boolean }) {
  const { speak } = useSpeech();
  const [order, setOrder] = useState(SPELL_WORDS);
  // Shuffle on the client only (avoids a server/client hydration mismatch).
  useEffect(() => setOrder([...SPELL_WORDS].sort(() => Math.random() - 0.5)), []);
  const [i, setI] = useState(0);
  const [score, setScore] = useState({ c: 0, n: 0 });
  const [mode, setMode] = useState<"listen" | "read">(available ? "listen" : "read");
  const w = order[i % order.length];
  const m = available ? mode : "read";

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">
          Listen &amp; spell <span className="label-tr">· Dinle ve yaz</span>
        </h2>
        <div className="flex items-center gap-2 text-sm">
          {available ? (
            <>
              <button className={`rounded-full px-3 py-1 ${m === "listen" ? "bg-fg text-bg" : "bg-card-2"}`} onClick={() => setMode("listen")}>
                🔊 Listen
              </button>
              <button className={`rounded-full px-3 py-1 ${m === "read" ? "bg-fg text-bg" : "bg-card-2"}`} onClick={() => setMode("read")}>
                👀 Sound it out
              </button>
            </>
          ) : (
            <span className="text-xs text-muted">No Turkish voice installed — using “sound it out” mode.</span>
          )}
          <span className="chip">
            {score.c}/{score.n}
          </span>
        </div>
      </div>
      {m === "listen" ? (
        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={() => speak(w.tr, 0.8)}>
            ▶ Play word
          </button>
          <button className="btn-ghost" onClick={() => speak(w.tr, 0.55)}>
            🐢 Slowly
          </button>
          <span className="text-sm text-muted">Hint: {w.en}</span>
        </div>
      ) : (
        <div>
          <div className="text-sm text-muted">Pronounced roughly:</div>
          <div className="text-2xl font-bold">“{w.say}”</div>
          <div className="text-sm text-muted">meaning: {w.en}</div>
        </div>
      )}
      <TypeAnswer
        key={i}
        resetKey={i}
        expected={w.tr}
        strict
        autoFocus={false}
        onChecked={(r) => setScore((s) => ({ c: s.c + (r.result === "correct" ? 1 : 0), n: s.n + 1 }))}
      >
        <button className="btn-primary" autoFocus onClick={() => setI(i + 1)}>
          Next word →
        </button>
      </TypeAnswer>
    </section>
  );
}
