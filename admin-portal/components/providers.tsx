"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { AlertProvider } from "@/lib/alerts-context";
import { ThemeProvider } from "@/components/theme-provider";
import { TestStoreProvider } from "@/lib/test-store";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <TestStoreProvider>
          <AlertProvider>{children}</AlertProvider>
        </TestStoreProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
