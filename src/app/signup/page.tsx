import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/nav";
import { sessionUser } from "@/lib/users/session";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Create your account · Türkçe 365" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const sp = await searchParams;
  if (await sessionUser()) redirect("/");
  return (
    <div className="mx-auto flex min-h-dvh max-w-[440px] flex-col px-4 py-10">
      <Wordmark />
      <div className="mt-[8vh] animate-rise">
        <h1 className="display-xl text-[52px]">Aramıza hoş geldin.</h1>
        <p className="mt-3 text-[17px] text-ink-soft">
          Create your account with the signup code you were given. Each code works once. After this you&apos;ll build your own year-long plan.
        </p>
      </div>
      <SignupForm code={sp.code ?? ""} />
      <p className="mt-8 text-[15px] text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-text underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
