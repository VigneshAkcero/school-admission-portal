"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { LayoutGrid, Users, FileText, Activity, Settings, MonitorSmartphone, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const adminNav = [
  { href: "/dashboard", label: "Admin Dashboard", icon: LayoutGrid },
  { href: "/applicants", label: "Applicants", icon: Users },
  { href: "/tests", label: "Tests", icon: FileText },
  { href: "/performance", label: "Performance", icon: Activity },
  { href: "/session-monitor", label: "Session Monitor", icon: MonitorSmartphone },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SchoolShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = useMemo(() => {
    if (user?.role === "admin") return adminNav;
    return [];
  }, [user]);

  const hasSidebar = user?.role === "admin";

  return (
    <div className="h-screen overflow-hidden animate-in bg-white">
      <div className="flex h-screen overflow-hidden bg-white">
        {hasSidebar && (
          <aside className="fixed inset-y-0 left-0 z-30 hidden w-[262px] flex-col justify-between border-r border-slate-800 bg-slate-900 px-5 py-7 text-white lg:flex">
            <div>
              <div className="mb-10 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/20 text-base font-black text-primary">
                  A
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
        )}

        <main
          className={cn(
            "min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-white p-4 md:p-6 xl:p-8",
            hasSidebar ? "lg:ml-[262px]" : "mx-auto w-full max-w-[1500px]"
          )}
        >
          <header className="mb-8 overflow-visible">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <h1 className="gradient-text pb-2 text-3xl font-black leading-[1.14] tracking-tight text-slate-900 md:text-4xl lg:text-5xl">
                {title}
              </h1>
              {user?.role === "receptionist" ? (
                <Button
                  variant="ghost"
                  className="self-start rounded-2xl border border-slate-200 bg-white px-5 py-3 text-slate-600 hover:bg-rose-50 hover:text-rose-600"
                  onClick={logout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              ) : null}
            </div>
            {subtitle && (
              <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 md:text-base">
                {subtitle}
              </p>
            )}
          </header>

          <div className="relative min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
