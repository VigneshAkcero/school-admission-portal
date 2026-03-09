"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, PlayCircle, Plus, Search, ShieldAlert } from "lucide-react";
import { getApiBase, getHomePathForRole, useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import type { ApplicantRow, ApplicantStatus } from "@/lib/types";
import { adminVisibleStatus, formatDateOnly, formatTestCode } from "@/lib/display";
import { SchoolShell } from "@/components/school-shell";
import { MetricCard } from "@/components/metric-card";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ApplicantForm = {
  studentName: string;
  parentName: string;
  mobile: string;
  grade: string;
};

const initialForm: ApplicantForm = {
  studentName: "",
  parentName: "",
  mobile: "",
  grade: "1",
};

export default function ApplicantsPage() {
  const router = useRouter();
  const { user, token, isReady } = useAuth();
  const [applicants, setApplicants] = useState<ApplicantRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<ApplicantStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [revokeApplicant, setRevokeApplicant] = useState<ApplicantRow | null>(null);
  const [generated, setGenerated] = useState<{ name: string; code: string } | null>(null);
  const [form, setForm] = useState<ApplicantForm>(initialForm);

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

  async function load() {
    if (!token) return;
    const applicantsData = await apiRequest<{ applicants: ApplicantRow[] }>(`/api/admin/applicants?status=all`, { token });
    setApplicants(
      applicantsData.applicants.map((applicant) => ({
        ...applicant,
        status: adminVisibleStatus(applicant.status),
      })),
    );
  }

  useEffect(() => {
    if (!token || user?.role !== "admin") return;
    let cancelled = false;
    const loadSafe = async () => {
      const applicantsData = await apiRequest<{ applicants: ApplicantRow[] }>(`/api/admin/applicants?status=all`, { token });
      if (!cancelled) {
        setApplicants(
          applicantsData.applicants.map((applicant) => ({
            ...applicant,
            status: adminVisibleStatus(applicant.status),
          })),
        );
      }
    };
    loadSafe().catch(() => undefined);
    const timer = window.setInterval(() => {
      loadSafe().catch(() => undefined);
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token, user?.role]);

  const counts = useMemo(() => {
    const all = applicants;
    return {
      pending: all.filter((item) => item.status === "pending").length,
      scheduled: all.filter((item) => item.status === "test_scheduled").length,
      started: all.filter((item) => item.status === "test_started").length,
      completed: all.filter((item) => item.status === "test_completed").length,
    };
  }, [applicants]);

  const filteredApplicants = useMemo(() => {
    return applicants.filter((applicant) => {
      const matchesStatus = statusFilter === "all" ? true : applicant.status === statusFilter;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        applicant.student_name.toLowerCase().includes(query) ||
        applicant.parent_name.toLowerCase().includes(query) ||
        applicant.mobile_number.toLowerCase().includes(query) ||
        String(applicant.test_code || "").toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [applicants, search, statusFilter]);

  async function submitApplicant() {
    if (!token) return;
    await apiRequest("/api/admin/applicants", {
      method: "POST",
      token,
      body: {
        studentName: form.studentName,
        parentName: form.parentName,
        mobile: form.mobile,
        grade: Number(form.grade),
      },
    });
    setAddOpen(false);
    setForm(initialForm);
    await load();
  }

  async function generateCode(applicant: ApplicantRow) {
    if (!token) return;
    const response = await apiRequest<{ testCode: string }>(`/api/admin/applicants/${applicant.id}/generate-code`, {
      method: "POST",
      token,
    });
    setGenerated({ name: applicant.student_name, code: response.testCode });
    await load();
  }

  async function confirmRevoke() {
    if (!token || !revokeApplicant) return;
    await fetch(`${getApiBase()}/api/admin/applicants/${revokeApplicant.id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    setRevokeApplicant(null);
    await load();
  }

  if (!user || user.role !== "admin") return null;

  return (
    <SchoolShell
      title="Applicant Directory"
    >
      <section className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Pending" value={counts.pending} accent="bg-amber-500" icon={<Clock3 className="h-5 w-5" />} />
          <MetricCard label="Test Scheduled" value={counts.scheduled} accent="bg-sky-500" icon={<ShieldAlert className="h-5 w-5" />} />
          <MetricCard label="Test Started" value={counts.started} accent="bg-emerald-500" icon={<PlayCircle className="h-5 w-5" />} />
          <MetricCard label="Test Completed" value={counts.completed} accent="bg-violet-500" icon={<CheckCircle2 className="h-5 w-5" />} />
        </div>

        <div className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="shrink-0 pb-2 text-[2.65rem] font-black leading-[1.08] tracking-tight text-slate-950">All Applicants</h2>
            <div className="grid w-full gap-3 lg:ml-auto lg:w-auto lg:grid-cols-[260px_260px_220px] lg:items-center">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search applicants..."
                  className="h-11 w-full rounded-2xl border-slate-100 bg-slate-50 pl-11 text-sm font-medium transition-all focus:border-blue-500 focus:bg-white"
                />
              </div>
              <Button className="h-11 w-full justify-center rounded-2xl bg-blue-600 px-6 text-sm font-black text-white shadow-md shadow-blue-600/15 transition-all hover:bg-blue-700 active:scale-[0.98]" onClick={() => setAddOpen(true)}>
                <Plus className="mr-2 h-5 w-5" />
                Add New applicant
              </Button>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ApplicantStatus | "all")}>
                <SelectTrigger className="h-11 w-full justify-start gap-1 rounded-2xl border-slate-100 bg-white px-4 text-sm font-bold text-slate-700 [&_[data-slot=select-value]]:flex-none [&>svg]:ml-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 shadow-2xl">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="test_scheduled">Test Scheduled</SelectItem>
                  <SelectItem value="test_started">Test Started</SelectItem>
                  <SelectItem value="test_completed">Test Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-hidden">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col className="w-[15%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[10%]" />
                  <col className="w-[12%]" />
                  <col className="w-[9%]" />
                  <col className="w-[10%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[11px] font-black uppercase tracking-[0.16em] text-slate-900">
                    <th className="whitespace-nowrap px-8 py-6 font-black text-slate-900">Student</th>
                    <th className="whitespace-nowrap px-5 py-6 font-black text-slate-900">Parent</th>
                    <th className="whitespace-nowrap px-5 py-6 font-black text-slate-900">Mobile</th>
                    <th className="whitespace-nowrap px-5 py-6 font-black text-slate-900">Grade</th>
                    <th className="whitespace-nowrap px-5 py-6 font-black text-slate-900">Applied Date</th>
                    <th className="whitespace-nowrap px-5 py-6 text-center font-black text-slate-900">Test Code</th>
                    <th className="whitespace-nowrap px-4 py-6 text-center font-black text-slate-900">Test Status</th>
                    <th className="whitespace-nowrap px-4 py-6 text-center font-black text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {filteredApplicants.map((applicant) => (
                  <tr key={applicant.id} className="group bg-white text-[13px] transition-colors duration-200 hover:bg-slate-50/50">
                    <td className="px-8 py-7 align-middle">
                      <div className="truncate text-[13px] font-normal text-slate-900">{applicant.student_name}</div>
                    </td>
                    <td className="truncate px-5 py-7 align-middle font-normal text-slate-800">{applicant.parent_name}</td>
                    <td className="px-5 py-7 align-middle font-normal text-slate-800">{applicant.mobile_number}</td>
                    <td className="px-5 py-7 align-middle font-normal text-slate-900">{`Grade ${applicant.grade}`}</td>
                    <td className="whitespace-nowrap px-5 py-7 align-middle font-normal text-slate-700">{formatDateOnly(applicant.applied_at)}</td>
                    <td className="px-5 py-7 align-middle text-center">
                      <span className="whitespace-nowrap font-mono text-[13px] font-normal text-blue-700">
                        {formatTestCode(applicant.test_code)}
                      </span>
                    </td>
                    <td className="px-4 py-7 align-middle text-center">
                      <StatusPill status={applicant.status} className="px-2 py-0.5 text-[10px] font-bold tracking-normal" />
                    </td>
                    <td className="px-4 py-7 align-middle">
                      <div className="flex items-center justify-center gap-2 text-[12px]">
                        {applicant.status === "pending" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-auto rounded-lg border border-blue-200 px-2.5 py-1 text-[12px] font-semibold text-blue-700 transition-all hover:bg-blue-50 hover:text-blue-700"
                            onClick={() => generateCode(applicant)}
                          >
                            Generate Code
                          </Button>
                        ) : null}
                        {applicant.status === "pending" ? <span className="text-slate-300">/</span> : null}
                        {["pending", "test_scheduled"].includes(applicant.status) ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-auto rounded-lg border border-rose-200 px-2.5 py-1 text-[12px] font-semibold text-rose-500 transition-all hover:bg-rose-50 hover:text-rose-600"
                            onClick={() => setRevokeApplicant(applicant)}
                          >
                            Revoke
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl rounded-[28px] bg-white">
          <DialogHeader>
            <DialogTitle>Add New Applicant</DialogTitle>
            <DialogDescription>Enter the student and parent details. This starts the applicant in pending status.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Student Name</Label>
              <Input className="h-12 rounded-2xl" value={form.studentName} onChange={(e) => setForm((prev) => ({ ...prev, studentName: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Parent Name</Label>
              <Input className="h-12 rounded-2xl" value={form.parentName} onChange={(e) => setForm((prev) => ({ ...prev, parentName: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Parent Mobile</Label>
              <Input
                className="h-12 rounded-2xl"
                value={form.mobile}
                onChange={(e) => setForm((prev) => ({ ...prev, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Grade</Label>
              <Select value={form.grade} onValueChange={(value) => setForm((prev) => ({ ...prev, grade: value }))}>
                <SelectTrigger className="h-12 w-full rounded-2xl bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white shadow-2xl">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((grade) => (
                    <SelectItem key={grade} value={String(grade)}>
                      {`Grade ${grade}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button className="rounded-xl bg-blue-600 px-8 text-white hover:bg-blue-700" onClick={submitApplicant}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(generated)} onOpenChange={(open) => !open && setGenerated(null)}>
        <DialogContent className="rounded-[28px] bg-white">
          <DialogHeader>
            <DialogTitle>Test Code Generated</DialogTitle>
            <DialogDescription>{generated ? `A unique code has been generated for ${generated.name}.` : ""}</DialogDescription>
          </DialogHeader>
          <div className="rounded-[24px] bg-blue-50 px-6 py-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-500">9 Digit Test Code</p>
            <div className="mt-4 text-5xl font-black tracking-[0.26em] text-blue-700">{generated?.code}</div>
          </div>
          <DialogFooter>
            <Button className="bg-slate-950 text-white hover:bg-slate-800 px-8 font-black rounded-xl" onClick={() => setGenerated(null)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(revokeApplicant)} onOpenChange={(open) => !open && setRevokeApplicant(null)}>
        <DialogContent className="rounded-[28px] bg-white">
          <DialogHeader>
            <DialogTitle>Revoke Applicant</DialogTitle>
            <DialogDescription>
              {revokeApplicant ? `Do you really want to revoke ${revokeApplicant.student_name}?` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-[22px] bg-rose-50 px-4 py-4 text-sm text-rose-700">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              This will remove the applicant from the active admin flow.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeApplicant(null)}>
              Cancel
            </Button>
            <Button className="bg-rose-600 text-white hover:bg-rose-700" onClick={confirmRevoke}>
              Confirm Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SchoolShell>
  );
}
