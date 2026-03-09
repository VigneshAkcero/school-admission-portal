"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Radar, CheckCircle2, Clock, History, FileClock } from "lucide-react";
import { getHomePathForRole, useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import type { AdminDashboardSummary } from "@/lib/types";
import { adminVisibleStatus, formatTestCode } from "@/lib/display";
import { SchoolShell } from "@/components/school-shell";
import { MetricCard } from "@/components/metric-card";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, isReady } = useAuth();
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);

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

  useEffect(() => {
    if (!token || user?.role !== "admin") return;
    let cancelled = false;
    const load = async () => {
      const data = await apiRequest<AdminDashboardSummary>("/api/admin/dashboard-summary", { token });
      if (!cancelled) {
        setSummary({
          ...data,
          latestStudents: data.latestStudents.map((student) => ({
            ...student,
            status: adminVisibleStatus(student.status),
          })),
        });
      }
    };
    load().catch(() => undefined);
    const timer = window.setInterval(() => {
      load().catch(() => undefined);
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token, user?.role]);

  if (!user || user.role !== "admin") return null;

  return (
    <SchoolShell
      title="Admin Dashboard"
    >
      <section className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Tests Completed"
            value={summary?.completedOverall ?? 0}
            accent="bg-blue-600"
            icon={<CheckCircle2 className="size-6" />}
          />
          <MetricCard
            label="Tests Active"
            value={summary?.activeParticipants ?? 0}
            accent="bg-emerald-500"
            icon={<Radar className="size-6 animate-pulse" />}
          />
          <MetricCard
            label="Pending Sessions"
            value={summary?.pendingApplicants ?? 0}
            accent="bg-amber-500"
            icon={<FileClock className="size-6" />}
          />
        </div>

        <div className="grid gap-6 pt-6">
          <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
            <div className="flex items-start justify-between border-b border-slate-50 p-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Activity Stream</p>
                </div>
                <h2 className="text-xl font-black tracking-tight text-slate-900">Recent Test Students</h2>
              </div>
              <Link href="/applicants">
                <Button variant="ghost" className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm hover:bg-slate-50">
                  Manage Pipeline
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="p-6">
              {summary?.latestStudents?.length ? (
                <div className="overflow-hidden rounded-[24px] border border-slate-100">
                  <table className="w-full table-fixed border-collapse">
                    <colgroup>
                      <col className="w-[38%]" />
                      <col className="w-[16%]" />
                      <col className="w-[22%]" />
                      <col className="w-[24%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-[11px] font-black uppercase tracking-[0.16em] text-slate-900">
                        <th className="px-6 py-4">Name</th>
                        <th className="px-4 py-4">Grade</th>
                        <th className="px-4 py-4 text-center">Test Code</th>
                        <th className="px-4 py-4 text-center">Test Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summary.latestStudents.slice(0, 5).map((student, index) => (
                        <tr key={`${student.id ?? student.test_code ?? "pending"}-${student.updated_at}-${index}`} className="text-[13px]">
                          <td className="px-6 py-5 font-medium text-slate-900">{student.student_name}</td>
                          <td className="px-4 py-5 font-normal text-slate-800">{`Grade ${student.grade}`}</td>
                          <td className="px-4 py-5 text-center">
                            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 font-mono text-[12px] font-semibold text-amber-900">
                              {formatTestCode(student.test_code)}
                            </span>
                          </td>
                          <td className="px-4 py-5 text-center">
                            <StatusPill status={student.status} className="px-2 py-0.5 text-[10px] font-bold tracking-normal" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-3xl border-2 border-dashed border-slate-100 py-20 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                    <History className="h-6 w-6" />
                  </div>
                  <p className="mt-4 font-bold text-slate-400">No scheduled students yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </SchoolShell>
  );
}
