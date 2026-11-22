import type { Metadata } from "next";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/shell/theme-provider";
import AppShell from "@/components/shell/AppShell";
// Self-hosted (bundled at build time): the studio must work in a venue with no
// network, and the house design uses IBM Plex Sans for language and IBM Plex Mono
// for every quantity.
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "ANC8+ Ethiopia · EDHS 2024–25",
  description:
    "Predicting attainment of eight antenatal care contacts in Ethiopia: where women are lost along the antenatal care ladder, who is left behind, and what our models show. Built on the 2024–25 Ethiopia DHS.",
};

// Runs before hydration to avoid a light/dark flash: the same keys ThemeProvider uses.
const themeInitScript = `
(function () {
  try {
    var theme = localStorage.getItem("anc-theme") || "light";
    var size = localStorage.getItem("anc-font-size");
    var family = localStorage.getItem("anc-font-family");
    document.documentElement.setAttribute("data-theme", theme);
    if (size && size !== "normal") document.documentElement.setAttribute("data-font-size", size);
    if (family && family !== "sans") document.documentElement.setAttribute("data-font-family", family);
  } catch (e) {}
})();
`;

function ShellFallback() {
  return (
    <div className="h-dvh w-full grid grid-rows-[38px_1fr_24px] bg-bg">
      <div className="bg-top" />
      <div className="px-14 py-12 text-11.5 text-faint">Loading the studio…</div>
      <div className="bg-top" />
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          {/* The shell reads the shared state from the address bar, which needs a
              Suspense boundary to prerender (Next 16, useSearchParams). */}
          <Suspense fallback={<ShellFallback />}>
            <AppShell>{children}</AppShell>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
