"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Users, CheckCircle2, Search, ChevronDown, ChevronUp, ShieldAlert, Timer, GraduationCap } from "lucide-react";
import { getHomePathForRole, useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import type { ApplicantRow } from "@/lib/types";
import { durationLabel, formatDateOnly, formatTestCode } from "@/lib/display";
import { PrincipalShell } from "@/components/principal-shell";
import { MetricCard } from "@/components/metric-card";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface SummaryResponse {
  total_applications: number;
  accepted_count: number;
  pending_reviews: number;
}

export default function PrincipalPage() {
  const router = useRouter();
  const { user, token, isReady } = useAuth();
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [trends, setTrends] = useState<Array<{ label: string; accepted_count: number }>>([]);
  const [results, setResults] = useState<ApplicantRow[]>([]);
  const [range, setRange] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [grade, setGrade] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [decisionState, setDecisionState] = useState<{ id: string; decision: "approved" | "rejected" } | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!user || !token) {
      router.push("/login");
      return;
    }
    if (user.role !== "principal") {
      router.push(getHomePathForRole(user.role));
    }
  }, [isReady, user, token, router]);

  async function loadSummary() {
    if (!token) return;
    const data = await apiRequest<SummaryResponse>("/api/principal/dashboard-summary", { token });
    setSummary(data);
  }

  async function loadTrends(nextRange = range) {
    if (!token) return;
    const data = await apiRequest<{ points: Array<{ label: string; accepted_count: number }> }>(
      `/api/principal/trends?range=${nextRange}`,
      { token },
    );
    setTrends(data.points);
  }

  async function loadResults() {
    if (!token) return;
    const query = new URLSearchParams();
    if (grade !== "all") query.set("grade", grade);
    if (search.trim()) query.set("search", search.trim());
    const data = await apiRequest<{ results: ApplicantRow[] }>(`/api/principal/results?${query.toString()}`, { token });
    setResults(data.results);
  }

  useEffect(() => {
    if (!token || user?.role !== "principal") return;
    loadSummary().catch(() => undefined);
    loadTrends().catch(() => undefined);
  }, [token, user?.role]);

  useEffect(() => {
    if (!token || user?.role !== "principal") return;
    loadTrends(range).catch(() => undefined);
  }, [range]);

  useEffect(() => {
    if (!token || user?.role !== "principal") return;
    loadResults().catch(() => undefined);
  }, [token, user?.role, grade, search]);

  async function takeDecision(id: string, decision: "approved" | "rejected") {
    if (!token) return;
    await apiRequest(`/api/principal/results/${id}/decision`, {
      method: "POST",
      token,
      body: { decision },
    });
    await Promise.all([loadSummary(), loadTrends(), loadResults()]);
  }

  function exportApprovedCsv() {
    const approved = results.filter((row) => row.status === "approved");
    const header = ["Student Name", "Parent Name", "Mobile", "Grade", "Test Code", "Applied Date", "Status", "English Score", "Math Score", "Science/EVS Score", "Score Percentage"];
    const lines = [header.join(",")];
    approved.forEach((row) => {
      lines.push(
        [
          row.student_name,
          row.parent_name,
          row.mobile_number,
          row.grade,
          row.test_code || "",
          formatDateOnly(row.applied_at),
          row.status,
          row.score_english ?? 0,
          row.score_math ?? 0,
          row.score_science_evs ?? 0,
          `${row.score_percentage ?? 0}%`
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "approved-students.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const scoreRows = useMemo(() => results, [results]);

  if (!user || user.role !== "principal") return null;

  return (
    <PrincipalShell title="Principal Dashboard">
      <section className="space-y-7">
        <div className="grid gap-4 xl:grid-cols-3">
          <MetricCard
            label="Intake Volume"
            value={summary?.total_applications ?? 0}
            accent="bg-blue-500"
            icon={<Users className="h-6 w-6" />}
          />
          <MetricCard
            label="Approved Students"
            value={summary?.accepted_count ?? 0}
            accent="bg-emerald-500"
            icon={<CheckCircle2 className="h-6 w-6" />}
          />
          <MetricCard
            label="Enrollment Rate"
            value={`${Math.round(((summary?.accepted_count ?? 0) / Math.max(summary?.total_applications ?? 0, 1)) * 100)}%`}
            accent="bg-amber-500"
            icon={<Timer className="h-6 w-6" />}
          />
        </div>

        <div className="premium-card">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">Admission Trends</h2>
            </div>
            <div className="flex items-center gap-4">
              <Select value={range} onValueChange={(v: any) => setRange(v)}>
                <SelectTrigger className="h-10 w-[140px] rounded-2xl border-slate-200 bg-white text-sm font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white shadow-2xl">
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="h-[300px] w-full pr-2 md:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontWeight: 700 }}
                />
                <Area
                  type="monotone"
                  dataKey="accepted_count"
                  stroke="#2563eb"
                  strokeWidth={4}
                  fill="url(#colorCount)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </PrincipalShell>
  );
}

function DetailRowItem({
  label,
  value,
  accent = "slate",
  warning = false,
  icon
}: {
  label: string;
  value: string | number;
  accent?: string;
  warning?: boolean;
  icon?: React.ReactNode;
}) {
  const accentColors: Record<string, string> = {
    slate: "text-slate-600",
    indigo: "text-indigo-600",
    blue: "text-blue-600",
    cyan: "text-cyan-600",
  };

  return (
    <div className={cn(
      "flex items-center justify-between rounded-xl px-4 py-3.5 transition-all text-sm font-bold",
      warning ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-slate-50/50 text-slate-600 border border-transparent hover:border-slate-100 hover:bg-white"
    )}>
      <div className="flex items-center gap-3">
        {icon && <span className="text-slate-400">{icon}</span>}
        <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{label}</span>
      </div>
      <span className={cn(
        "text-base font-black drop-shadow-sm",
        warning ? "text-rose-700" : (accent ? accentColors[accent] : "text-slate-950")
      )}>
        {value}
      </span>
    </div>
  );
}
