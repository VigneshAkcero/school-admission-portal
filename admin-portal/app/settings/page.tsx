"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserCircle2 } from "lucide-react";
import { getHomePathForRole, useAuth } from "@/lib/auth-context";
import { SchoolShell } from "@/components/school-shell";

export default function SettingsPage() {
  const router = useRouter();
  const { user, token, isReady } = useAuth();

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
      subtitle="Basic profile information for the school administration workspace."
    >
      <section className="grid gap-6">
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
