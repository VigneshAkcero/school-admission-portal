"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun, UserCircle2 } from "lucide-react";
import { useTheme } from "next-themes";
import { getHomePathForRole, useAuth } from "@/lib/auth-context";
import { SchoolShell } from "@/components/school-shell";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  const router = useRouter();
  const { user, token, isReady } = useAuth();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!isReady) return;
    if (!user || !token) {
      router.push("/login");
      return;
    }
    if (user.role !== "admin") {
      router.push(getHomePathForRole(user.role));
    }
  }, [isReady, user, token, router]);

  if (!user || user.role !== "admin") return null;

  return (
    <SchoolShell
      title="Settings"
      subtitle="Basic profile information and appearance controls for the school administration workspace."
    >
      <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="mb-6 flex items-center gap-3">
            <UserCircle2 className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Profile</h2>
          </div>
          <div className="grid gap-4">
            <ProfileField label="Name" value={user.name || "School User"} />
            <ProfileField label="Email" value={user.email} />
            <ProfileField label="Role" value={user.role} />
          </div>
        </div>

        <div className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <h2 className="text-2xl font-black tracking-tight text-slate-950">Appearance</h2>
          <p className="mt-2 text-sm text-slate-500">Use a single toggle to switch the admin workspace between light and dark mode.</p>
          <div className="mt-6 rounded-[22px] bg-slate-50 px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {theme === "dark" ? <Moon className="h-5 w-5 text-slate-700" /> : <Sun className="h-5 w-5 text-amber-500" />}
                <div>
                  <div className="text-sm font-black text-slate-950">Dark Mode</div>
                  <div className="text-xs font-medium text-slate-500">Turn dark appearance on or off.</div>
                </div>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
            </div>
          </div>
        </div>
      </section>
    </SchoolShell>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-slate-50 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-bold text-slate-950">{value}</div>
    </div>
  );
}
