"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getHomePathForRole, useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import type { ApplicantRow } from "@/lib/types";
import { SchoolShell } from "@/components/school-shell";
import { MetricCard } from "@/components/metric-card";

interface TestsResponse {
  scheduled: ApplicantRow[];
  active: ApplicantRow[];
  completed: ApplicantRow[];
}

export default function PerformancePage() {
  const router = useRouter();
  const { user, token, isReady } = useAuth();
  const [data, setData] = useState<TestsResponse>({ scheduled: [], active: [], completed: [] });

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
    apiRequest<TestsResponse>("/api/admin/tests", { token }).then(setData).catch(() => undefined);
  }, [token, user?.role]);

  const metrics = useMemo(() => {
    const all = [...data.scheduled, ...data.active, ...data.completed];
    const avgTabSwitches = data.completed.length
      ? Math.round((data.completed.reduce((sum, row) => sum + (row.total_tab_switches || 0), 0) / data.completed.length) * 10) / 10
      : 0;
    const completedDurations = data.completed
      .map((row) => getSessionDurationMinutes(row))
      .filter((value): value is number => value !== null);
    const avgDuration = completedDurations.length
      ? Math.round(completedDurations.reduce((sum, value) => sum + value, 0) / completedDurations.length)
      : 0;
    const gradeDistribution = Array.from({ length: 9 }, (_, index) => {
      const grade = index + 1;
      return {
        grade: `G${grade}`,
        scheduled: all.filter((row) => row.grade === grade && row.status === "test_scheduled").length,
        active: all.filter((row) => row.grade === grade && row.status === "test_started").length,
        completed: all.filter((row) => row.grade === grade && ["test_completed", "approved", "rejected"].includes(row.status)).length,
      };
    });

    return {
      avgTabSwitches,
      avgDuration,
      completedToday: data.completed.length,
      startedNow: data.active.length,
      gradeDistribution,
    };
  }, [data]);

  if (!user || user.role !== "admin") return null;

  return (
    <SchoolShell
      title="Performance"
      subtitle="Behavioral and operational insights from the exam pipeline, without exposing student scores inside the admin workspace."
    >
      <section className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          <MetricCard label="Completed Today" value={metrics.completedToday} accent="bg-violet-500" />
          <MetricCard label="Active Now" value={metrics.startedNow} accent="bg-blue-500" />
          <MetricCard label="Avg Duration" value={`${metrics.avgDuration} min`} accent="bg-sky-500" />
          <MetricCard label="Avg Tab Switches" value={metrics.avgTabSwitches} accent="bg-rose-500" />
        </div>

        <div className="grid gap-6">
          <div className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] w-full">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Grade-wise Pipeline</h2>
            <p className="mt-2 text-sm text-slate-500">Track where each grade currently sits in the scheduling and examination flow.</p>
            <div className="mt-6 h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.gradeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="grade" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip />
                  <Bar dataKey="scheduled" fill="#f97316" radius={[6, 6, 0, 0]} name="Scheduled" />
                  <Bar dataKey="active" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Active" />
                  <Bar dataKey="completed" fill="#22c55e" radius={[6, 6, 0, 0]} name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 flex items-center gap-5 text-sm font-semibold text-slate-700">
              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />Scheduled</span>
              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />Active</span>
              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />Completed</span>
            </div>
          </div>
        </div>
      </section>
    </SchoolShell>
  );
}

function getSessionDurationMinutes(row: ApplicantRow) {
  const start = row.start_time || row.test_started_at;
  const end = row.end_time || row.test_completed_at;
  if (!start || !end) return null;

  const duration = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (!Number.isFinite(duration) || duration <= 0) return null;

  // Admission exams are capped at 45 minutes; clamp stale or bad historical rows.
  return Math.min(duration, 45);
}
