"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { LayoutGrid, Users, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const principalNav = [
  { href: "/principal", label: "Principal Dashboard", icon: LayoutGrid },
  { href: "/results", label: "Applicants", icon: Users },
  { href: "/principal-settings", label: "Settings", icon: Settings },
];

export function PrincipalShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { logout } = useAuth();

  const navItems = useMemo(() => principalNav, []);

  return (
    <div className="min-h-screen animate-in bg-background">
      <div className="flex min-h-screen">
        <aside className="hidden w-[262px] shrink-0 flex-col justify-between border-r border-slate-800 bg-slate-900 px-5 py-7 text-white lg:flex">
          <div>
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/20 text-base font-black text-primary">
                P
              </div>
              <div>
                <div className="text-[1.75rem] font-black leading-tight tracking-tight text-white">Admission</div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Console</div>
              </div>
            </div>
            <nav className="space-y-2.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-300",
                      isActive
                        ? "bg-primary text-white shadow-xl shadow-primary/20"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <Button
            variant="ghost"
            className="group justify-start rounded-2xl px-4 py-6 text-slate-400 hover:bg-white/5 hover:text-white"
            onClick={logout}
          >
            <LogOut className="mr-3 h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
            Logout
          </Button>
        </aside>

        <main className="flex-1 p-4 md:p-6 xl:p-8">
          <header className="mb-8 overflow-visible">
            <h1 className="pb-2 text-3xl font-black leading-[1.14] tracking-tight text-[#406fcb] md:text-4xl lg:text-5xl">
              {title}
            </h1>
          </header>

          <div className="relative">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
