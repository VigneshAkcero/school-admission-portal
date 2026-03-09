"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, ChevronUp, ShieldAlert, Timer, GraduationCap, CheckCircle2, Clock } from "lucide-react";
import { getHomePathForRole, useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import type { ApplicantRow } from "@/lib/types";
import { durationLabel, formatDateOnly, formatTestCode } from "@/lib/display";
import { PrincipalShell } from "@/components/principal-shell";
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

export default function ResultsPage() {
  const router = useRouter();
  const { user, token, isReady } = useAuth();
  const [results, setResults] = useState<ApplicantRow[]>([]);
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
    loadResults().catch(() => undefined);
  }, [token, user?.role, grade, search]);

  async function takeDecision(id: string, decision: "approved" | "rejected") {
    if (!token) return;
    await apiRequest(`/api/principal/results/${id}/decision`, {
      method: "POST",
      token,
      body: { decision },
    });
    await loadResults();
  }

  function exportApprovedCsv() {
    const approved = results.filter((row) => row.status === "approved");
    const header = ["Student Name", "Parent Name", "Parent Mobile", "Grade", "Date", "Code", "Percentage", "Status"];
    const lines = [header.join(",")];
    approved.forEach((row) => {
      lines.push(
        [
          row.student_name,
          row.parent_name,
          row.mobile_number,
          row.grade,
          formatDateOnly(row.applied_at),
          row.test_code || "",
          `${row.score_percentage ?? 0}%`,
          row.status,
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "principal-applicants.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const scoreRows = useMemo(() => results, [results]);

  if (!user || user.role !== "principal") return null;

  return (
    <PrincipalShell title="Applicants">
      <section className="space-y-7">
        <div className="premium-card">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-xl font-black tracking-tight text-slate-900">Application Performance</h2>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search applicants..."
                  className="h-10 rounded-2xl border-slate-200 bg-slate-50/50 pl-11 text-sm font-medium transition-all focus:bg-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger className="h-10 w-[120px] rounded-2xl border-slate-200 bg-white text-sm font-bold">
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white shadow-2xl">
                  <SelectItem value="all">All Grades</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
                    <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="h-10 rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-800"
                onClick={exportApprovedCsv}
              >
                Export CSV
              </Button>
            </div>
          </div>

          <div className="relative overflow-x-auto rounded-[32px] border border-slate-100 bg-white">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-50 bg-slate-50/30">
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-600">Student Name</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-600">Parent Name</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-600">Parent Mobile</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-600">Grade</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-600">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-600">Code</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-600">Performance</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-600">Status</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-600 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {scoreRows.map((row) => {
                  const isExpanded = expandedId === row.id;
                  const principalStatus = row.status === "test_completed" ? "pending" : row.status;
                  return (
                    <Fragment key={row.id}>
                      <tr
                        className={cn("group cursor-pointer transition-all hover:bg-slate-50/80", isExpanded ? "bg-indigo-50/30" : "")}
                        onClick={() => setExpandedId((prev) => (prev === row.id ? null : row.id))}
                      >
                        <td className="px-8 py-5">
                          <div className="text-base font-black leading-tight text-slate-900">{row.student_name}</div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm font-normal text-slate-700">{row.parent_name}</div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm font-medium text-slate-700">{row.mobile_number}</div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="inline-flex w-fit rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">GRADE {row.grade}</span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm font-medium text-slate-700">{formatDateOnly(row.applied_at)}</div>
                        </td>
                        <td className="px-6 py-5">
                          <code className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-black text-blue-600 shadow-sm md:text-sm">
                            {formatTestCode(row.test_code)}
                          </code>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-500/30">
                              {Math.round(row.score_percentage ?? 0)}%
                            </div>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-primary" />}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          {principalStatus === "approved" ? (
                            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                              Approved
                            </span>
                          ) : (
                            <StatusPill status={principalStatus as any} />
                          )}
                        </td>
                        <td className="px-8 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                          {principalStatus === "pending" ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                className="h-8 rounded-xl bg-emerald-50 px-4 text-xs font-bold text-emerald-700 shadow-sm transition-all hover:bg-emerald-100"
                                onClick={() => setDecisionState({ id: row.id, decision: "approved" })}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-xl border border-rose-200 px-4 text-xs font-bold text-rose-600 transition-all hover:bg-rose-50"
                                onClick={() => setDecisionState({ id: row.id, decision: "rejected" })}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-slate-400">Resolved</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr className="bg-white">
                          <td colSpan={9} className="px-8 pb-8 pt-2">
                            <div className="grid gap-6 md:grid-cols-2">
                              <div className="rounded-[28px] border border-slate-100 bg-slate-50/60 p-6">
                                <h3 className="mb-5 flex items-center gap-2 border-b border-slate-200 pb-4 text-xl font-black text-slate-900">
                                  <GraduationCap className="h-5 w-5 text-indigo-500" />
                                  Academic Scorecard
                                </h3>
                                <div className="space-y-3">
                                  <DetailRowItem label="Overall Percentage" value={`${row.score_percentage ?? 0}%`} accent="indigo" />
                                  <DetailRowItem label="Correct Answers" value={`${row.score ?? 0} / ${row.total_questions ?? 0}`} accent="blue" />
                                  <DetailRowItem label="English Correct" value={row.score_english ?? 0} accent="indigo" />
                                  <DetailRowItem label="Mathematics Correct" value={row.score_math ?? 0} accent="blue" />
                                  <DetailRowItem label={row.grade >= 7 ? "Science Correct" : "EVS Correct"} value={row.score_science_evs ?? 0} accent="cyan" />
                                </div>
                              </div>
                              <div className="rounded-[28px] border border-slate-100 bg-slate-50/60 p-6">
                                <h3 className="mb-5 flex items-center gap-2 border-b border-slate-200 pb-4 text-xl font-black text-slate-900">
                                  <ShieldAlert className="h-5 w-5 text-blue-600" />
                                  Proctoring Compliance
                                </h3>
                                <div className="space-y-3">
                                  <DetailRowItem label="Exam Initiation" value={row.start_time_ist || "—"} icon={<Clock className="h-4 w-4" />} />
                                  <DetailRowItem label="Exam Conclusion" value={row.end_time_ist || "—"} icon={<CheckCircle2 className="h-4 w-4" />} />
                                  <DetailRowItem label="Active Duration" value={durationLabel(row.start_time, row.end_time)} icon={<Timer className="h-4 w-4" />} />
                                  <DetailRowItem
                                    label="Tab Switch Events"
                                    value={row.total_tab_switches || 0}
                                    warning={(row.total_tab_switches || 0) > 3}
                                    icon={<ShieldAlert className="h-4 w-4" />}
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {!scoreRows.length && (
              <div className="py-24 text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                  <Search className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900">No matching applications</h3>
                <p className="mt-2 font-bold text-slate-400">Try adjusting your filters or search criteria.</p>
              </div>
            )}
          </div>
        </div>

        <AlertDialog open={Boolean(decisionState)} onOpenChange={(open) => !open && setDecisionState(null)}>
          <AlertDialogContent className="rounded-[24px] border-slate-200 bg-white shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-black text-slate-900">
                {decisionState?.decision === "approved" ? "Approve student?" : "Reject student?"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium leading-relaxed text-slate-500">
                {decisionState?.decision === "approved"
                  ? "Are you sure you want to approve this student?"
                  : "Are you sure you want to reject this student?"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className={cn(
                  "rounded-xl",
                  decisionState?.decision === "approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                )}
                onClick={async () => {
                  if (!decisionState) return;
                  await takeDecision(decisionState.id, decisionState.decision);
                  setDecisionState(null);
                }}
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </PrincipalShell>
  );
}

function DetailRowItem({
  label,
  value,
  accent = "slate",
  warning = false,
  icon,
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
    <div
      className={cn(
        "flex items-center justify-between rounded-xl px-4 py-3.5 text-sm font-bold transition-all",
        warning ? "border border-rose-100 bg-rose-50 text-rose-700" : "border border-transparent bg-slate-50/50 text-slate-600 hover:border-slate-100 hover:bg-white"
      )}
    >
      <div className="flex items-center gap-3">
        {icon && <span className="text-slate-400">{icon}</span>}
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      </div>
      <span className={cn("text-base font-black drop-shadow-sm", warning ? "text-rose-700" : accentColors[accent] || "text-slate-950")}>
        {value}
      </span>
    </div>
  );
}
