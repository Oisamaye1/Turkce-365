import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/nav";
import { sessionUser } from "@/lib/users/session";
import { countUsers, legacyPasswordHash } from "@/lib/users/store";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · Türkçe 365" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/";
  if (await sessionUser()) redirect(next);
  const setup = (await countUsers()) === 0;
  const legacy = setup ? !!(await legacyPasswordHash()) : false;
  return (
    <div className="mx-auto flex min-h-dvh max-w-[420px] flex-col px-4 py-10">
      <Wordmark />
      <div className="mt-[12vh] animate-rise">
        <h1 className="display-xl text-[56px]">{setup ? "Hoş geldin." : "Tekrar hoş geldin."}</h1>
        <p className="mt-3 text-[17px] text-ink-soft">
          {setup
            ? legacy
              ? "Türkçe 365 now has accounts. Create yours as the admin: pick a username and confirm the password you already use. All your progress stays with this account."
              : "Create the admin account. You'll invite everyone else with one-time signup codes."
            : "Sign in to continue your plan."}
        </p>
      </div>
      <LoginForm setup={setup} legacy={legacy} next={next} />
      {!setup ? (
        <p className="mt-8 text-[15px] text-ink-soft">
          Got a signup code?{" "}
          <Link href="/signup" className="font-medium text-brand-text underline-offset-4 hover:underline">
            Create your account
          </Link>
        </p>
      ) : null}
    </div>
  );
}
