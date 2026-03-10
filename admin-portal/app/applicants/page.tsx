"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Clock3, Globe, PlayCircle, Plus, Search, ShieldAlert } from "lucide-react";
import { getApiBase, getHomePathForRole, useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import type { ApplicantRow, ApplicantStatus } from "@/lib/types";
import { adminVisibleStatus, formatApplicantStatus, formatDateOnly, statusTone } from "@/lib/display";
import { formatRegCode, formatTestCode } from "@/lib/codeUtils";
import { SchoolShell } from "@/components/school-shell";
import { MetricCard } from "@/components/metric-card";
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
  const [sourceFilter, setSourceFilter] = useState<"all" | "parent_portal" | "receptionist">("all");
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
    setApplicants(normalizeApplicants(applicantsData.applicants));
  }

  useEffect(() => {
    if (!token || user?.role !== "admin") return;
    let cancelled = false;
    const loadSafe = async () => {
      const applicantsData = await apiRequest<{ applicants: ApplicantRow[] }>(`/api/admin/applicants?status=all`, { token });
      if (!cancelled) {
        setApplicants(normalizeApplicants(applicantsData.applicants));
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

  function deriveUiStatus(applicant: ApplicantRow) {
    if (applicant.status === "payment_pending") return "payment_pending";
    if (applicant.status === "paid") return "paid";
    if (applicant.status === "pending") return "pending";
    if (applicant.status === "test_scheduled" || applicant.status === "created") return "test_scheduled";
    if (applicant.status === "test_started" || applicant.status === "started") return "test_started";
    return "test_completed";
  }

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
      const matchesSource = sourceFilter === "all" ? true : applicant.source === sourceFilter;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        applicant.student_name.toLowerCase().includes(query) ||
        applicant.parent_name.toLowerCase().includes(query) ||
        applicant.mobile_number.toLowerCase().includes(query) ||
        String(applicant.test_code || "").toLowerCase().includes(query) ||
        String(applicant.registration_code || "").toLowerCase().includes(query) ||
        deriveUiStatus(applicant).includes(query);
      return matchesStatus && matchesSource && matchesSearch;
    });
  }, [applicants, search, sourceFilter, statusFilter]);

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
    const response = await apiRequest<{ testCode: string; applicant: ApplicantRow }>(`/api/admin/applicants/${applicant.id}/generate-code`, {
      method: "POST",
      token,
    });
    setApplicants((current) =>
      normalizeApplicants(current.map((row) =>
        row.id === applicant.id
          ? {
              ...row,
              ...response.applicant,
              status: adminVisibleStatus(response.applicant.status),
            }
          : row,
      )),
    );
    setGenerated({ name: applicant.student_name, code: response.testCode });
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
            <div className="grid w-full gap-3 lg:ml-auto lg:w-auto lg:grid-cols-[260px_240px_180px_220px] lg:items-center">
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
                  <SelectItem value="payment_pending">Payment Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="test_scheduled">Test Scheduled</SelectItem>
                  <SelectItem value="test_started">Test Started</SelectItem>
                  <SelectItem value="test_completed">Test Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={(value) => setSourceFilter(value as "all" | "parent_portal" | "receptionist")}>
                <SelectTrigger className="h-11 w-full justify-start gap-1 rounded-2xl border-slate-100 bg-white px-4 text-sm font-bold text-slate-700 [&_[data-slot=select-value]]:flex-none [&>svg]:ml-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 shadow-2xl">
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="parent_portal">Online</SelectItem>
                  <SelectItem value="receptionist">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[1560px] border-collapse text-left">
                <colgroup>
                  <col className="w-[220px]" />
                  <col className="w-[190px]" />
                  <col className="w-[210px]" />
                  <col className="w-[170px]" />
                  <col className="w-[110px]" />
                  <col className="w-[190px]" />
                  <col className="w-[150px]" />
                  <col className="w-[180px]" />
                  <col className="w-[180px]" />
                  <col className="w-[260px]" />
                </colgroup>
                <thead>
                  <tr className="text-left text-[11px] font-black uppercase tracking-[0.16em] text-slate-900">
                    <th className="whitespace-nowrap px-4 py-3.5 font-black text-slate-900 border-b border-slate-100">Student</th>
                    <th className="whitespace-nowrap px-4 py-3.5 font-black text-slate-900 border-b border-slate-100">Reg Code</th>
                    <th className="whitespace-nowrap px-4 py-3.5 font-black text-slate-900 border-b border-slate-100">Parent</th>
                    <th className="whitespace-nowrap px-4 py-3.5 font-black text-slate-900 border-b border-slate-100">Mobile</th>
                    <th className="whitespace-nowrap px-4 py-3.5 text-center font-black text-slate-900 border-b border-slate-100">Grade</th>
                    <th className="whitespace-nowrap px-4 py-3.5 font-black text-slate-900 border-b border-slate-100">Applied Date</th>
                    <th className="whitespace-nowrap px-4 py-3.5 text-center font-black text-slate-900 border-b border-slate-100">Mode</th>
                    <th className="whitespace-nowrap px-4 py-3.5 text-center font-black text-slate-900 border-b border-slate-100">Test Code</th>
                    <th className="whitespace-nowrap px-4 py-3.5 text-center font-black text-slate-900 border-b border-slate-100">Test Status</th>
                    <th className="whitespace-nowrap px-4 py-3.5 text-center font-black text-slate-900 border-b border-slate-100 min-w-[200px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {filteredApplicants.map((applicant) => (
                  <tr key={applicant.id} className="group bg-white text-[13px] transition-colors duration-200 hover:bg-slate-50/50">
                    <td className="px-4 py-3.5 align-middle border-b border-slate-100">
                      <div className="text-[13px] font-normal text-slate-900">{applicant.student_name}</div>
                    </td>
                    <td className="px-4 py-3.5 align-middle border-b border-slate-100">
                      <span style={{ fontFamily: "'Courier New', monospace", fontSize: "0.78rem", color: "#334155" }}>{formatRegCode(applicant.registration_code || "") || "-"}</span>
                    </td>
                    <td className="px-4 py-3.5 align-middle font-normal text-slate-800 border-b border-slate-100">{applicant.parent_name}</td>
                    <td className="px-4 py-3.5 align-middle font-normal text-slate-800 border-b border-slate-100">{applicant.mobile_number}</td>
                    <td className="px-4 py-3.5 align-middle text-center font-semibold text-slate-900 border-b border-slate-100">{applicant.grade}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 align-middle font-normal text-slate-700 border-b border-slate-100">{formatDateOnly(applicant.applied_at)}</td>
                    <td className="px-4 py-3.5 align-middle text-center border-b border-slate-100">
                      {applicant.source === "parent_portal" ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "#eff6ff", color: "#1e40af", padding: "0.2rem 0.6rem", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600 }}>
                          <Globe size={12} /> Online
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "#f1f5f9", color: "#475569", padding: "0.2rem 0.6rem", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600 }}>
                          <Building2 size={12} /> Offline
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-middle text-center border-b border-slate-100">
                      <span style={{ fontFamily: "'Courier New', monospace", fontSize: "0.78rem", color: "#334155" }}>
                        {formatTestCode(applicant.test_code)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-middle text-center border-b border-slate-100 whitespace-nowrap">
                      {(() => {
                        const status = deriveUiStatus(applicant);
                        return (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.72rem] font-bold ${statusTone(status)}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
                            {formatApplicantStatus(status)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3.5 align-middle border-b border-slate-100 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2 text-[12px] whitespace-nowrap">
                        {["pending", "paid"].includes(applicant.status) ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-auto rounded-lg border border-blue-200 px-2.5 py-1 text-[12px] font-semibold text-blue-700 transition-all hover:bg-blue-50 hover:text-blue-700"
                            onClick={() => generateCode(applicant)}
                          >
                            Generate Code
                          </Button>
                        ) : null}
                        {["pending", "paid"].includes(applicant.status) ? <span className="text-slate-300">/</span> : null}
                        {["pending", "test_scheduled", "paid"].includes(applicant.status) ? (
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
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-500">12 Character Test Code</p>
            <div className="mt-4 text-4xl font-black tracking-[0.12em] text-blue-700">{formatTestCode(generated?.code || "")}</div>
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

function normalizeApplicants(applicants: ApplicantRow[]) {
  return [...applicants]
    .map((applicant) => ({
      ...applicant,
      status: adminVisibleStatus(applicant.status),
    }))
    .sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime());
}
