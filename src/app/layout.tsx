import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/nav";
import { VoiceProvider } from "@/components/speech";
import { THEME_SCRIPT } from "@/components/theme";
import { countDue } from "@/lib/db/cards";
import { getSettings } from "@/lib/db/settings";
import { streak } from "@/lib/db/stats";

export const metadata: Metadata = {
  title: "Türkçe 365",
  description: "Your personal Turkish tutor — 20 minutes a day, A0 → A2/B1.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141c2f" },
  ],
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, st, due] = await Promise.all([getSettings(), streak(), countDue()]);
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <VoiceProvider initialVoiceURI={settings.voiceURI}>
          <AppShell streak={st.current} due={due.due + due.fresh}>
            {children}
          </AppShell>
        </VoiceProvider>
      </body>
    </html>
  );
}
