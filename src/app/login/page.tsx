import { hasPassword } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const setup = !(await hasPassword());
  return (
    <div className="mx-auto mt-10 max-w-sm space-y-4">
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent text-lg font-bold text-accent-fg">365</div>
        <h1 className="mt-3 text-2xl font-bold">Türkçe 365</h1>
        <p className="text-sm text-muted">{setup ? "Welcome! Choose a password for your tutor · Şifreni belirle" : "Welcome back · Tekrar hoş geldin"}</p>
      </div>
      <LoginForm setup={setup} next={sp.next ?? "/"} />
    </div>
  );
}
