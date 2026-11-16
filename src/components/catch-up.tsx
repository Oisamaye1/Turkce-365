"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { generateTodayAction } from "@/app/actions";

/**
 * Catch-up: if the computer was asleep at 05:30, today's lesson is generated
 * the first time the app is opened. Also used for the manual button.
 */
export function GenerateLesson({ auto, label = "Make today's lesson" }: { auto: boolean; label?: string }) {
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
      <p className="flex items-center gap-3 text-ink-soft" role="status">
        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        Preparing today&apos;s lesson…
      </p>
    );
  return (
    <div className="flex flex-col gap-2">
      <button className="btn-primary self-start" onClick={() => run(true)}>
        {label}
      </button>
      {state === "error" ? <p className="text-[14px] text-bad-text">{msg}</p> : msg ? <p className="text-[14px] text-muted">{msg}</p> : null}
    </div>
  );
}
