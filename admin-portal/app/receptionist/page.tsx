"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, CalendarDays, CalendarFold, BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getHomePathForRole, useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import type { ApplicantRow } from "@/lib/types";
import { MetricCard } from "@/components/metric-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SchoolShell } from "@/components/school-shell";
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

interface DashboardResponse {
  summary: {
    pending_count: number;
    scheduled_count: number;
    today_count: number;
    week_count: number;
    month_count: number;
    year_count: number;
  };
  applicants: ApplicantRow[];
}

interface RegistrationsByGradeResponse {
  period: "today" | "week" | "month" | "year";
  grades: Array<{
    grade: number;
    registrations: number;
  }>;
}

const FILTER_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
] as const;

const CHART_BAR_COLORS = ["#4d7fe6", "#5b8bf0", "#69a1ff", "#7ab4ff", "#4e89f5", "#3f78dd", "#6c9dff", "#8ab7ff", "#5c8ded"];

export default function ReceptionistPage() {
  const router = useRouter();
  const { user, token, isReady } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [registrationsByGrade, setRegistrationsByGrade] = useState<RegistrationsByGradeResponse | null>(null);
  const [gradeFilter, setGradeFilter] = useState<(typeof FILTER_OPTIONS)[number]["value"]>("today");
  const [form, setForm] = useState({
    studentName: "",
    parentName: "",
    mobile: "",
    grade: "1",
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successName, setSuccessName] = useState("");

  useEffect(() => {
    if (!isReady) return;
    if (!user || !token) {
      router.push("/login");
      return;
    }
    if (user.role !== "receptionist") {
      router.push(getHomePathForRole(user.role));
    }
  }, [isReady, user, token, router]);

  async function load() {
    if (!token) return;
    const response = await apiRequest<DashboardResponse>("/api/receptionist/dashboard", { token });
    setData(response);
  }

  async function loadRegistrationsByGrade(period: (typeof FILTER_OPTIONS)[number]["value"]) {
    if (!token) return;
    const response = await apiRequest<RegistrationsByGradeResponse>(`/api/stats/registrations-by-grade?period=${period}`, { token });
    setRegistrationsByGrade(response);
  }

  useEffect(() => {
    if (!token || user?.role !== "receptionist") return;
    load().catch(() => undefined);
  }, [token, user?.role]);

  useEffect(() => {
    if (!token || user?.role !== "receptionist") return;
    loadRegistrationsByGrade(gradeFilter).catch(() => undefined);
  }, [token, user?.role, gradeFilter]);

  async function submit() {
    if (!token) return;
    await apiRequest("/api/receptionist/applicants", {
      method: "POST",
      token,
      body: {
        studentName: form.studentName,
        parentName: form.parentName,
        mobile: form.mobile,
        grade: Number(form.grade),
      },
    });
    setSuccessName(form.studentName);
    setForm({ studentName: "", parentName: "", mobile: "", grade: "1" });
    await load();
    await loadRegistrationsByGrade(gradeFilter);
  }

  if (!user || user.role !== "receptionist") return null;

  return (
    <SchoolShell
      title="Reception Desk"
    >
      <section className="space-y-8">
        <div className="grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
          <div className="rounded-[28px] border border-slate-200/80 bg-white px-7 py-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <div className="mb-8 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[2rem] font-black tracking-tight text-slate-900">Add Applicant</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">Enter student details to create record</p>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="grid gap-2.5">
                <Label className="font-bold text-slate-700">Student Name</Label>
                <Input
                  placeholder="Enter full name"
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50/70 px-4 text-base focus:border-primary focus:ring-primary/20"
                  value={form.studentName}
                  onChange={(e) => setForm((prev) => ({ ...prev, studentName: e.target.value }))}
                />
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="grid gap-2.5">
                  <Label className="font-bold text-slate-700">Parent Name</Label>
                  <Input
                    placeholder="Father / Mother"
                    className="h-12 rounded-2xl border-slate-200 bg-slate-50/70 px-4 text-base focus:border-primary focus:ring-primary/20"
                    value={form.parentName}
                    onChange={(e) => setForm((prev) => ({ ...prev, parentName: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2.5">
                  <Label className="font-bold text-slate-700">Mobile Number</Label>
                  <Input
                    placeholder="10-digit number"
                    className="h-12 rounded-2xl border-slate-200 bg-slate-50/70 px-4 text-base focus:border-primary focus:ring-primary/20"
                    value={form.mobile}
                    onChange={(e) => setForm((prev) => ({ ...prev, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                  />
                </div>
              </div>
              <div className="grid max-w-[220px] gap-2.5">
                <Label className="font-bold text-slate-700">Grade</Label>
                <Select value={form.grade} onValueChange={(value) => setForm((prev) => ({ ...prev, grade: value }))}>
                  <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/70 px-4 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white shadow-2xl">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((grade) => (
                      <SelectItem key={grade} value={String(grade)} className="font-bold">
                        {`Grade ${grade}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-5 rounded-[22px] border border-emerald-100 bg-emerald-50/50 p-2.5">
                <Button
                  className="h-12 w-full rounded-2xl bg-[linear-gradient(180deg,#0f9f63_0%,#0d8a56_100%)] text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all hover:translate-y-[-1px] hover:shadow-xl"
                  onClick={() => setConfirmOpen(true)}
                >
                  Create Applicant Record
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Registration Metrics</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <MetricCard
                label="Registrations Today"
                value={data?.summary.today_count ?? 0}
                accent="bg-blue-600"
                icon={<CalendarDays className="size-5" />}
                className="min-h-[168px] rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
              />
              <MetricCard
                label="Registrations This Year"
                value={data?.summary.year_count ?? 0}
                accent="bg-violet-500"
                icon={<CalendarFold className="size-5" />}
                className="min-h-[168px] rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
              />
            </div>
            <div className="rounded-[30px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 shadow-sm">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-slate-900">Registrations by Grade</h3>
                    <p className="mt-1 text-sm font-medium text-slate-500">Track how admissions are distributed across grades.</p>
                  </div>
                </div>
                <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                  {FILTER_OPTIONS.map((option) => {
                    const active = gradeFilter === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                          active
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                        onClick={() => setGradeFilter(option.value)}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={registrationsByGrade?.grades ?? []} barCategoryGap={22} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      dataKey="grade"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#475569", fontSize: 13, fontWeight: 800 }}
                      tickFormatter={(value) => `${value}`}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(77,127,230,0.08)" }}
                      contentStyle={{
                        borderRadius: 18,
                        border: "1px solid #dbe4f0",
                        boxShadow: "0 20px 45px rgba(15,23,42,0.12)",
                        backgroundColor: "#ffffff",
                      }}
                      formatter={(value: number) => [value, "Registrations"]}
                      labelFormatter={(value) => `Grade ${value}`}
                    />
                    <Bar dataKey="registrations" radius={[14, 14, 6, 6]} maxBarSize={42}>
                      {(registrationsByGrade?.grades ?? []).map((entry, index) => (
                        <Cell key={`grade-${entry.grade}`} fill={CHART_BAR_COLORS[index % CHART_BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
                {`Showing ${registrationsByGrade?.period ?? gradeFilter} registrations grouped by grade.`}
              </div>
            </div>
          </div>
        </div>
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-[24px] border-slate-200 bg-white shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-slate-900">Create applicant record?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed text-slate-500">
              Are you sure you want to create this applicant record?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">No</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-blue-600 text-white hover:bg-blue-700"
              onClick={async () => {
                await submit();
                setConfirmOpen(false);
              }}
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(successName)} onOpenChange={(open) => !open && setSuccessName("")}>
        <AlertDialogContent className="rounded-[24px] border-slate-200 bg-white shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-slate-900">Applicant created</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed text-slate-500">
              You have successfully created this applicant record{successName ? ` for ${successName}` : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="rounded-xl bg-blue-600 text-white hover:bg-blue-700" onClick={() => setSuccessName("")}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SchoolShell>
  );
}
