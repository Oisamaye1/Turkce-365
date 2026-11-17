import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/users/session";
import "./globals.css";
import { AppShell } from "@/components/nav";
import { ServiceWorker } from "@/components/pwa";
import { VoiceProvider } from "@/components/speech";
import { THEME_SCRIPT } from "@/components/theme";
import { countDue } from "@/lib/db/cards";
import { getSettings } from "@/lib/db/settings";
import { streak } from "@/lib/db/stats";

export const metadata: Metadata = {
  title: "Türkçe 365",
  description: "Your personal Turkish tutor — 20 minutes a day, A0 → A2/B1.",
  applicationName: "Türkçe 365",
  // iPhone / iPad: "Add to Home Screen" opens full-screen, with this name under the icon.
  appleWebApp: { capable: true, title: "Türkçe 365", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  // Older iOS versions only read the Apple-specific name.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1518" },
  ],
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const path = (await headers()).get("x-pathname");
  // A signed cookie whose account was paused, deleted or signed out everywhere: back to login.
  // (The middleware doesn't set x-pathname on /login and /signup, so those never loop.)
  if (!user && path) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (!user) {
    // Signed out: login and signup pages only, no app chrome or learner data.
    return (
      <html lang="en" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        </head>
        <body className="min-h-dvh font-sans antialiased">
          <VoiceProvider initialVoiceURI={null}>{children}</VoiceProvider>
          <ServiceWorker />
        </body>
      </html>
    );
  }
  if (user.mustChangePassword && !(path ?? "/").startsWith("/account")) redirect("/account?reset=1");
  const [settings, st, due] = await Promise.all([getSettings(), streak(), countDue()]);
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <VoiceProvider initialVoiceURI={settings.voiceURI}>
          <AppShell streak={st.current} due={due.due + due.fresh} user={{ name: user.name, username: user.username, isAdmin: user.role === "admin" }}>
            {children}
          </AppShell>
        </VoiceProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
