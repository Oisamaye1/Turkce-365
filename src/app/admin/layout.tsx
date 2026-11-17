import { notFound } from "next/navigation";
import { MoreTabs } from "@/components/nav";
import { AdminTabs } from "@/components/admin/admin-ui";
import { sessionUser } from "@/lib/users/session";

export const metadata = { title: "Admin · Türkçe 365" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await sessionUser();
  if (!me || me.role !== "admin") notFound();
  return (
    <div>
      <MoreTabs />
      <header className="mb-8">
        <p className="text-[15px] text-muted">Admin</p>
        <h1 className="font-display mt-1 text-[33px] leading-tight font-semibold sm:text-[42px]">
          Learners and invitations <span className="ml-1 align-middle text-[17px] font-normal text-muted" lang="tr">Yönetim</span>
        </h1>
      </header>
      <AdminTabs />
      <div className="mt-8">{children}</div>
    </div>
  );
}
