"use client";

import { createContext, useContext, useEffect } from "react";
import { startOffline } from "@/lib/offline";
import Header, { MobileNav } from "@/components/dash/Header";
import { ScopeProvider } from "./ScopePicker";
import Tour from "./Tour";

interface ShellHeader {
  crumb?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

/** Kept for screens that still call it; the dashboard has no per-screen header bar. */
const HeaderContext = createContext<(h: ShellHeader) => void>(() => {});
export function useShellHeader(header: ShellHeader, deps: unknown[] = []) {
  const set = useContext(HeaderContext);
  useEffect(() => {
    set(header);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * The dashboard shell: one header with the sections and tools, then a single scrolling
 * page. No sidebar and no second navigation: every view is reached from the header.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  // Save the app for offline use, once the first screen has what it needs.
  useEffect(() => startOffline(), []);

  return (
    <HeaderContext.Provider value={() => {}}>
      <ScopeProvider>
        <div className="h-dvh w-full flex flex-col bg-bg overflow-hidden">
          <Header />
          <MobileNav />
          <main className="flex-1 overflow-auto min-h-0 scroll-smooth" id="content">
            {children}
          </main>
          <Tour />
        </div>
      </ScopeProvider>
    </HeaderContext.Provider>
  );
}
