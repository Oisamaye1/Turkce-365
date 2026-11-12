import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomTabs, Nav } from "@/components/nav";
import { VoiceProvider } from "@/components/speech";
import { THEME_SCRIPT } from "@/components/theme";
import { getSettings } from "@/lib/db/settings";

export const metadata: Metadata = {
  title: "Türkçe 365",
  description: "Your personal Turkish tutor — 20 minutes a day, A0 → A2/B1.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <VoiceProvider initialVoiceURI={settings.voiceURI}>
          <Nav />
          <main className="mx-auto max-w-5xl px-4 pt-5 pb-28 sm:pb-16">{children}</main>
          <BottomTabs />
        </VoiceProvider>
      </body>
    </html>
  );
}
