"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, CalendarDays, CalendarRange, CalendarClock, CalendarFold } from "lucide-react";
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

export default function ReceptionistPage() {
  const router = useRouter();
  const { user, token, isReady } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
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

  useEffect(() => {
    if (!token || user?.role !== "receptionist") return;
    load().catch(() => undefined);
  }, [token, user?.role]);

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
                label="Registrations This Week"
                value={data?.summary.week_count ?? 0}
                accent="bg-emerald-500"
                icon={<CalendarRange className="size-5" />}
                className="min-h-[168px] rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
              />
              <MetricCard
                label="Registrations This Month"
                value={data?.summary.month_count ?? 0}
                accent="bg-amber-500"
                icon={<CalendarClock className="size-5" />}
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
