"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider } from "@/lib/auth-context";
import { AlertProvider } from "@/lib/alerts-context";
import { ThemeProvider } from "@/components/theme-provider";
import { TestStoreProvider } from "@/lib/test-store";

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [PopmeltProvider, setPopmeltProvider] = useState<ComponentType<{ children: ReactNode; navigate?: (url: string) => void }> | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    let active = true;
    import("@popmelt.com/core").then((mod) => {
      if (active) {
        setPopmeltProvider(() => mod.PopmeltProvider);
      }
    }).catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const content = (
    <AuthProvider>
      <TestStoreProvider>
        <AlertProvider>{children}</AlertProvider>
      </TestStoreProvider>
    </AuthProvider>
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {PopmeltProvider ? <PopmeltProvider navigate={(url) => router.push(url)}>{content}</PopmeltProvider> : content}
    </ThemeProvider>
  );
}
