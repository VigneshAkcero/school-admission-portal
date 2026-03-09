"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
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
    const avgDuration = data.completed.length
      ? Math.round(
        data.completed.reduce((sum, row) => {
          if (!row.start_time || !row.end_time) return sum;
          return sum + (new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) / 60000;
        }, 0) / data.completed.length,
      )
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
      pipeline: [
        { name: "Scheduled", value: data.scheduled.length, color: "#2563eb" },
        { name: "Active", value: data.active.length, color: "#2563eb" },
        { name: "Completed", value: data.completed.length, color: "#7c3aed" },
      ],
    };
  }, [data]);

  if (!user || user.role !== "admin") return null;

  return (
    <SchoolShell
      title="Performance"
      subtitle="Behavioral and operational insights from the exam pipeline, without exposing student scores inside the admin workspace."
    >
      <section className="space-y-8">
        <div className="grid gap-4 xl:grid-cols-4">
          <MetricCard label="Completed Today" value={metrics.completedToday} accent="bg-violet-500" />
          <MetricCard label="Active Now" value={metrics.startedNow} accent="bg-blue-500" />
          <MetricCard label="Avg Duration" value={`${metrics.avgDuration} min`} accent="bg-sky-500" />
          <MetricCard label="Avg Tab Switches" value={metrics.avgTabSwitches} accent="bg-rose-500" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Grade-wise Pipeline</h2>
            <p className="mt-2 text-sm text-slate-500">Track where each grade currently sits in the scheduling and examination flow.</p>
            <div className="mt-6 h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.gradeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="grade" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip />
                  <Bar dataKey="scheduled" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="active" fill="#059669" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="completed" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Pipeline Split</h2>
            <p className="mt-2 text-sm text-slate-500">A quick operational view of how the current school testing pipeline is distributed.</p>
            <div className="mt-6 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={metrics.pipeline} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={5}>
                    {metrics.pipeline.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-3">
              {metrics.pipeline.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm font-bold text-slate-800">{entry.name}</span>
                  </div>
                  <span className="text-sm font-black text-slate-950">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </SchoolShell>
  );
}
