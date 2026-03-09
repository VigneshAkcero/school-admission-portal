"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, GraduationCap } from "lucide-react";
import { getHomePathForRole, useAuth } from "@/lib/auth-context";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { user, isReady, isLoading, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isReady || !user) return;
    router.push(getHomePathForRole(user.role));
  }, [isReady, user, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const result = (await login(username, password)) as {
      ok: boolean;
      error?: string;
      role?: "admin" | "principal" | "receptionist";
    };
    if (!result.ok) {
      setError(result.error || "Login failed - Invalid credentials");
      return;
    }
    router.push(getHomePathForRole(result.role || "admin"));
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-[1fr_560px] xl:grid-cols-[1fr_640px] bg-white overflow-hidden">
      {/* Left Branding Pane */}
      <section className="relative hidden lg:flex flex-col items-center justify-center overflow-hidden border-r border-slate-200/70 bg-[linear-gradient(180deg,#f7fbff_0%,#eef5ff_52%,#f3f7fd_100%)] p-12">
        {/* Abstract Background Elements */}
        <div className="pointer-events-none absolute left-0 top-0 h-full w-full opacity-70">
          <div className="absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-blue-100/80 blur-[120px]" />
          <div className="absolute bottom-[-12%] right-[-8%] h-[460px] w-[460px] rounded-full bg-sky-100/60 blur-[120px]" />
          <div className="absolute left-[20%] top-[18%] h-[180px] w-[180px] rounded-full bg-white/70 blur-[40px]" />
          <div className="absolute left-[28%] top-[38%] h-[240px] w-[240px] rounded-full bg-blue-50/70 blur-[70px]" />
        </div>

        <div className="relative z-10 text-center text-white max-w-lg">
          <div className="mb-10 inline-flex h-24 w-24 items-center justify-center rounded-[32px] border border-blue-100 bg-white/85 shadow-[0_22px_60px_rgba(59,130,246,0.12)] backdrop-blur-sm">
            <GraduationCap className="h-12 w-12 text-[#4d7fe6]" />
          </div>
          <h1 className="text-5xl font-black tracking-tight mb-6 leading-tight text-slate-900">
            Admission Console
          </h1>
          <p className="text-xl font-bold leading-relaxed text-slate-500">
            Manage your school intake, assessments, and student progress with our professional admission system.
          </p>
        </div>

      </section>

      {/* Right Login Pane */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-y-auto bg-[linear-gradient(180deg,#f8fbff_0%,#f3f6fb_100%)] px-8 py-12 md:p-12 xl:p-24">
        <div className="w-full max-w-[420px]">
          <div className="mb-12 text-center lg:hidden">
            <h1 className="text-3xl font-black tracking-tight text-[#406fcb]">Admission Console</h1>
          </div>

          <div className="premium-card rounded-[32px] border border-blue-100/70 bg-white/92 p-8 shadow-[0_26px_80px_rgba(148,163,184,0.18)] md:p-10">
            <div className="mb-12 pt-4 text-center">
              <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Sign In</h2>
            </div>

            <form className="space-y-6" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-black text-slate-600 ml-1">Username</Label>
                <Input
                  id="email"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="admin"
                  className="h-14 rounded-2xl border-blue-100 bg-slate-50/80 px-6 font-bold text-slate-700 transition-all placeholder:text-slate-400 focus:border-[#6f97ea] focus:bg-white focus:ring-4 focus:ring-[#6f97ea]/10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" title="password" className="text-sm font-black text-slate-600 ml-1">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter password"
                    className="h-14 rounded-2xl border-blue-100 bg-slate-50/80 px-6 font-bold text-slate-700 transition-all placeholder:text-slate-400 focus:border-[#6f97ea] focus:bg-white focus:ring-4 focus:ring-[#6f97ea]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#5c85dd]"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-black uppercase tracking-widest text-center animate-in">
                  {error}
                </div>
              ) : null}

              <Button
                className="h-14 w-full rounded-2xl border border-[#5b84dc]/35 bg-[linear-gradient(180deg,#6f96e7_0%,#4f78d8_100%)] text-lg font-black text-white shadow-[0_18px_40px_rgba(79,120,216,0.26)] transition-all hover:translate-y-[-1px] hover:bg-[linear-gradient(180deg,#678ee0_0%,#476fd0_100%)] hover:shadow-[0_22px_48px_rgba(79,120,216,0.3)] active:scale-[0.98]"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Sign In"}
              </Button>
            </form>
          </div>


        </div>
      </section>
    </main >
  );
}

function CredentialRow({ label, email, pass }: { label: string; email: string; pass: string }) {
  return (
    <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 transition-colors hover:bg-slate-100/50">
      <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center text-[11px] font-black shrink-0">{label}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold text-slate-600 truncate">{email}</div>
        <div className="text-[9px] font-black text-slate-400 font-mono tracking-wider">{pass}</div>
      </div>
    </div>
  );
}
