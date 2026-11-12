"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, hasPassword, setPassword } from "@/lib/auth";
import { SESSION_COOKIE, SESSION_DAYS, makeSession } from "@/lib/auth-cookie";

async function startSession() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return;
  (await cookies()).set(SESSION_COOKIE, await makeSession(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "/";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

export async function loginAction(_: string | null, form: FormData): Promise<string | null> {
  const pw = String(form.get("password") ?? "");
  if (!(await hasPassword())) {
    // First visit: choose the password.
    const confirm = String(form.get("confirm") ?? "");
    if (pw.length < 8) return "Use at least 8 characters.";
    if (pw !== confirm) return "The two passwords don't match.";
    await setPassword(pw);
  } else if (!(await checkPassword(pw))) {
    await new Promise((r) => setTimeout(r, 800));
    return "Wrong password · Yanlış şifre";
  }
  await startSession();
  redirect(safeNext(form.get("next")));
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
