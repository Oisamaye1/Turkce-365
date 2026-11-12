import { Wordmark } from "@/components/nav";
import { Simit } from "@/components/simit";
import { SpeechBubble } from "@/components/ui";
import { hasPassword } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const setup = !(await hasPassword());
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-10">
      <div className="text-center">
        <Wordmark />
      </div>
      <div className="mt-10 flex items-center gap-3">
        <Simit size={110} mood={setup ? "happy" : "calm"} className="shrink-0" />
        <SpeechBubble className="flex-1">
          {setup ? (
            <>
              <p className="font-display text-xl font-extrabold">Hoş geldin!</p>
              <p className="text-ink-soft">I&apos;m Simit. Choose a password so only you can open your tutor.</p>
            </>
          ) : (
            <>
              <p className="font-display text-xl font-extrabold">Tekrar hoş geldin!</p>
              <p className="text-ink-soft">Enter your password to continue.</p>
            </>
          )}
        </SpeechBubble>
      </div>
      <LoginForm setup={setup} next={sp.next ?? "/"} />
    </div>
  );
}
