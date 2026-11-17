"use client";

import { useEffect, useState } from "react";
import { IconX } from "./icons";

/** Registers /sw.js (production only). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

type Platform = "installed" | "ios" | "android" | "other";
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Installed already? iPhone/iPad? Android/Chrome (with the native install prompt)? */
function useInstall() {
  const [platform, setPlatform] = useState<Platform>("other");
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    setPlatform(standalone ? "installed" : ios ? "ios" : /Android/.test(ua) ? "android" : "other");
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setPlatform("installed");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const r = await prompt.userChoice;
    if (r.outcome === "accepted") setPlatform("installed");
    setPrompt(null);
  };
  return { platform, canPrompt: !!prompt, install };
}

const ShareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="mx-0.5 inline -translate-y-0.5" aria-label="Share">
    <path d="M12 3v12M8 7l4-4 4 4" />
    <path d="M6 11H5a1 1 0 00-1 1v8a1 1 0 001 1h14a1 1 0 001-1v-8a1 1 0 00-1-1h-1" />
  </svg>
);

function Steps({ platform, canPrompt, install }: ReturnType<typeof useInstall>) {
  if (platform === "ios")
    return (
      <p className="text-[15px] text-ink-soft">
        In Safari, tap Share <ShareIcon /> at the bottom of the screen, then <b className="font-medium text-ink">Add to Home Screen</b>.
      </p>
    );
  if (canPrompt)
    return (
      <button className="btn-primary" onClick={install}>
        Install the app
      </button>
    );
  return (
    <p className="text-[15px] text-ink-soft">
      In Chrome, open the <b className="font-medium text-ink">⋮</b> menu and tap <b className="font-medium text-ink">Add to Home screen</b> or{" "}
      <b className="font-medium text-ink">Install app</b>.
    </p>
  );
}

const DISMISS_KEY = "t365.installHint.dismissedAt";

/** Small card on phones that aren't using the installed app yet. Dismiss hides it for 30 days. */
export function InstallHint() {
  const inst = useInstall();
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      setHidden(Date.now() - at < 30 * 86_400_000);
    } catch {
      setHidden(false);
    }
  }, []);
  if (hidden || inst.platform === "installed" || inst.platform === "other") return null;
  return (
    <div className="mb-8 flex animate-rise items-start gap-4 rounded-[14px] border border-line p-4" role="note">
      <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-[10px]" />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-medium">Put Türkçe 365 on your home screen</p>
        <Steps {...inst} />
      </div>
      <button
        className="-m-1 rounded-lg p-1 text-muted hover:bg-haze hover:text-ink"
        aria-label="Hide this"
        onClick={() => {
          try {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
          } catch {}
          setHidden(true);
        }}
      >
        <IconX size={18} />
      </button>
    </div>
  );
}

/** Always-visible section for the Account page. */
export function InstallSection() {
  const inst = useInstall();
  return (
    <div className="space-y-3">
      {inst.platform === "installed" ? (
        <p className="text-[15px] text-ok-text">You&apos;re using the installed app. Nice.</p>
      ) : (
        <>
          <p className="text-[15px] text-ink-soft">Add Türkçe 365 to your phone&apos;s home screen and it opens full-screen, like any other app.</p>
          {inst.platform === "other" ? (
            <ul className="space-y-1.5 text-[15px] text-ink-soft">
              <li>
                <b className="font-medium text-ink">iPhone or iPad:</b> in Safari, tap Share <ShareIcon /> then Add to Home Screen.
              </li>
              <li>
                <b className="font-medium text-ink">Android:</b> in Chrome, open the ⋮ menu and tap Add to Home screen or Install app.
              </li>
            </ul>
          ) : (
            <Steps {...inst} />
          )}
          <p className="text-[13px] text-muted">On iPhone the home-screen app keeps its own sign-in, so you&apos;ll sign in once more the first time you open it.</p>
        </>
      )}
    </div>
  );
}
