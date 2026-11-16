import { Wordmark } from "@/components/nav";
import { hasPassword } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const setup = !(await hasPassword());
  return (
    <div className="mx-auto flex min-h-dvh max-w-[420px] flex-col px-4 py-10">
      <Wordmark />
      <div className="mt-[14vh]">
        <h1 className="display-xl text-[56px]">{setup ? "Hoş geldin." : "Tekrar hoş geldin."}</h1>
        <p className="mt-3 text-[17px] text-ink-soft">
          {setup ? "Choose a password so only you can open your tutor." : "Enter your password to continue."}
        </p>
      </div>
      <LoginForm setup={setup} next={sp.next ?? "/"} />
    </div>
  );
}
