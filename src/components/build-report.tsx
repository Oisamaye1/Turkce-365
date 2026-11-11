"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildReportNowAction } from "@/app/actions";

export function BuildReportButton() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <button
      className="btn-ghost text-xs"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await buildReportNowAction();
        setBusy(false);
        router.refresh();
      }}
    >
      {busy ? "Building…" : "Build this week's report now"}
    </button>
  );
}
