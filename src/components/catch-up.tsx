"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { generateTodayAction } from "@/app/actions";

/**
 * Catch-up: if the computer was asleep at 05:30, today's lesson is generated
 * the first time the app is opened. Also used for the manual "Generate now" button.
 */
export function GenerateLesson({ auto, label = "Generate now · Şimdi oluştur" }: { auto: boolean; label?: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "working" | "error">(auto ? "working" : "idle");
  const [msg, setMsg] = useState<string>("");
  const started = useRef(false);

  const run = async (manual: boolean) => {
    setState("working");
    const res = await generateTodayAction(manual);
    if (res.status === "error") {
      setState("error");
      setMsg(res.message);
      return;
    }
    if (res.status === "busy") {
      // Another run (e.g. the scheduler) is working — poll.
      setTimeout(() => router.refresh(), 8000);
      return;
    }
    setMsg(res.message);
    router.refresh();
  };

  useEffect(() => {
    if (auto && !started.current) {
      started.current = true;
      run(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  if (state === "working")
    return (
      <div className="flex items-center gap-3 rounded-xl bg-sea-soft px-4 py-3 text-sm text-sea">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-sea border-t-transparent" />
        Preparing today&apos;s lesson… Claude usually needs about a minute (offline lessons are instant).
      </div>
    );
  return (
    <div className="flex flex-col gap-2">
      <button className="btn-primary self-start" onClick={() => run(true)}>
        {label}
      </button>
      {state === "error" ? <p className="text-sm text-bad">{msg}</p> : msg ? <p className="text-sm text-muted">{msg}</p> : null}
    </div>
  );
}
