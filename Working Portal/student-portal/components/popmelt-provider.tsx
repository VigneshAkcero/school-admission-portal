"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export function StudentPopmeltProvider({ children }: { children: ReactNode }) {
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

  if (!PopmeltProvider) {
    return <>{children}</>;
  }

  return <PopmeltProvider navigate={(url) => router.push(url)}>{children}</PopmeltProvider>;
}
