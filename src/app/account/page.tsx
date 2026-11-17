import { MoreTabs } from "@/components/nav";
import { InstallSection } from "@/components/pwa";
import { PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/users/session";
import { logoutAction } from "../login/actions";
import { signOutEverywhereAction } from "./actions";
import { NameForm, PasswordForm } from "./forms";

export const metadata = { title: "Account · Türkçe 365" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ reset?: string; changed?: string }> }) {
  const sp = await searchParams;
  const me = await requireUser();
  const since = new Date(me.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div>
      <MoreTabs />
      <PageTitle en="Account" tr="Hesap" lede={`Signed in as @${me.username}${me.role === "admin" ? ", admin" : ""}. Learning since ${since}.`} />

      {me.mustChangePassword || sp.reset ? (
        <div className="mb-10 animate-rise rounded-[14px] bg-warn-tint p-5" role="status">
          <p className="font-display text-[19px] font-semibold text-warn-text">Choose your own password</p>
          <p className="mt-1 text-[15px] text-ink-soft">Your password was reset by the admin. Enter the temporary one as the current password, then pick a new one.</p>
        </div>
      ) : null}
      {sp.changed ? (
        <div className="mb-10 animate-rise rounded-[14px] bg-ok-tint p-5" role="status">
          <p className="font-medium text-ok-text">Password changed. Other devices have been signed out.</p>
        </div>
      ) : null}

      <div className="grid max-w-3xl gap-12">
        <section className="space-y-4">
          <h2 className="font-display text-[21px] font-semibold">Your name</h2>
          <NameForm name={me.name} />
        </section>

        <section className="space-y-4 border-t border-line pt-8">
          <h2 className="font-display text-[21px] font-semibold">Password</h2>
          <PasswordForm />
        </section>

        <section className="space-y-3 border-t border-line pt-8">
          <h2 className="font-display text-[21px] font-semibold">Use it like an app</h2>
          <InstallSection />
        </section>

        <section className="space-y-3 border-t border-line pt-8">
          <h2 className="font-display text-[21px] font-semibold">Your data</h2>
          <p className="text-[15px] text-ink-soft">Download everything you've done in the app: words, reviews, lessons, writing and your plan.</p>
          <a href="/api/export/json" className="btn-secondary">
            Download my data (JSON)
          </a>
        </section>

        <section className="space-y-3 border-t border-line pt-8">
          <h2 className="font-display text-[21px] font-semibold">Sign out</h2>
          <div className="flex flex-wrap gap-3">
            <form action={logoutAction}>
              <button className="btn-secondary">Sign out</button>
            </form>
            <form action={signOutEverywhereAction}>
              <button className="btn-quiet h-11">Sign out on every device</button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
