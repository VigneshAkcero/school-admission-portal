"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, ChevronUp, ShieldAlert, Timer, GraduationCap, CheckCircle2, Clock } from "lucide-react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { getHomePathForRole, useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import type { ApplicantRow } from "@/lib/types";
import { durationLabel, formatDateOnly, formatTestCode } from "@/lib/display";
import { PrincipalShell } from "@/components/principal-shell";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [selectedRow, setSelectedRow] = useState<ApplicantRow | null>(null);
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
    const response = await apiRequest<{ success: boolean; status: ApplicantRow["status"] }>(`/api/principal/results/${id}/decision`, {
      method: "POST",
      token,
      body: { decision },
    });
    setResults((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              status: response.status,
            }
          : row,
      ),
    );
    setSelectedRow((current) => (current && current.id === id ? { ...current, status: response.status } : current));
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
          formatDateOnly(getSubmissionTimestamp(row)),
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

  const scoreRows = useMemo(() => [...results].sort(compareBySubmissionTimeDesc), [results]);

  if (!user || user.role !== "principal") return null;

  return (
    <PrincipalShell title="Applicants">
      <section className="min-w-0 space-y-7">
        <div className="premium-card min-w-0">
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
                    <SelectItem key={g} value={g.toString()}>{g}</SelectItem>
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

          <div className="relative w-full overflow-x-auto rounded-[32px] border border-slate-100 bg-white">
            <table className="min-w-[1360px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-50 bg-slate-50/30">
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-600">Student Name</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-600">Parent Name</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-600">Parent Mobile</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-600">Grade</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-600">Date</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-600">Code</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-600">Performance</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-600">Status</th>
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-600 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {scoreRows.map((row) => {
                  const isSelected = selectedRow?.id === row.id;
                  const principalStatus = row.status === "test_completed" ? "pending" : row.status;
                  return (
                    <tr
                      key={row.id}
                      className={cn("group cursor-pointer transition-all hover:bg-slate-50/80", isSelected ? "bg-indigo-50/30" : "")}
                      onClick={() => setSelectedRow(row)}
                    >
                      <td className="px-5 py-5">
                        <div className="text-base font-black leading-tight text-slate-900">{row.student_name}</div>
                      </td>
                      <td className="px-4 py-5">
                        <div className="text-sm font-normal text-slate-700">{row.parent_name}</div>
                      </td>
                      <td className="px-4 py-5">
                        <div className="text-sm font-medium text-slate-700">{row.mobile_number}</div>
                      </td>
                      <td className="px-4 py-5">
                        <span className="inline-flex min-w-9 justify-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">{row.grade}</span>
                      </td>
                      <td className="px-4 py-5">
                        <div className="text-sm font-medium text-slate-700">{formatDateOnly(getSubmissionTimestamp(row))}</div>
                      </td>
                      <td className="px-4 py-5">
                        <code className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-black text-blue-600 shadow-sm md:text-sm">
                          {formatTestCode(row.test_code)}
                        </code>
                      </td>
                      <td className="px-4 py-5">
                        <button
                          type="button"
                          className="flex items-center gap-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRow(row);
                          }}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-500/30">
                            {Math.round(row.score_percentage ?? 0)}%
                          </div>
                          {isSelected ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-primary" />}
                        </button>
                      </td>
                      <td className="px-4 py-5">
                        {principalStatus === "approved" ? (
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                            Approved
                          </span>
                        ) : (
                          <StatusPill status={principalStatus as any} />
                        )}
                      </td>
                      <td className="px-5 py-5 text-right" onClick={(e) => e.stopPropagation()}>
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

        <Dialog open={Boolean(selectedRow)} onOpenChange={(open) => !open && setSelectedRow(null)}>
          {selectedRow ? (
            <DialogContent
              showCloseButton={false}
              overlayClassName="bg-black/60"
              className="!w-[96vw] !max-w-[1600px] gap-0 rounded-[32px] border border-slate-200 bg-white p-0 shadow-2xl"
            >
              <DialogHeader className="border-b border-slate-200 px-8 py-6">
                <DialogTitle className="text-2xl font-black text-slate-900">{selectedRow.student_name}</DialogTitle>
              </DialogHeader>
              <DialogClose className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-lg font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900">
                ✕
              </DialogClose>
              <div className="grid gap-6 p-6 md:grid-cols-[1.35fr_1fr]">
                <div className="rounded-[28px] border border-slate-100 bg-slate-50/60 p-6">
                  <h3 className="mb-5 flex items-center gap-2 border-b border-slate-200 pb-4 text-xl font-black text-slate-900">
                    <GraduationCap className="h-5 w-5 text-indigo-500" />
                    Academic Scorecard
                  </h3>
                  <AcademicScorecard row={selectedRow} />
                </div>
                <div className="rounded-[28px] border border-slate-100 bg-slate-50/60 p-6">
                  <h3 className="mb-5 flex items-center gap-2 border-b border-slate-200 pb-4 text-xl font-black text-slate-900">
                    <ShieldAlert className="h-5 w-5 text-blue-600" />
                    Proctoring Compliance
                  </h3>
                  <div className="space-y-3">
                    <DetailRowItem label="Exam Initiation" value={selectedRow.start_time_ist || "—"} icon={<Clock className="h-4 w-4" />} />
                    <DetailRowItem label="Exam Conclusion" value={selectedRow.end_time_ist || "—"} icon={<CheckCircle2 className="h-4 w-4" />} />
                    <DetailRowItem label="Active Duration" value={durationLabel(selectedRow.start_time, selectedRow.end_time)} icon={<Timer className="h-4 w-4" />} />
                    <DetailRowItem
                      label="Tab Switch Events"
                      value={selectedRow.total_tab_switches || 0}
                      warning={(selectedRow.total_tab_switches || 0) > 3}
                      icon={<ShieldAlert className="h-4 w-4" />}
                    />
                  </div>
                </div>
              </div>
            </DialogContent>
          ) : null}
        </Dialog>

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

function compareBySubmissionTimeDesc(a: ApplicantRow, b: ApplicantRow) {
  return getSubmissionDateValue(b) - getSubmissionDateValue(a);
}

function getSubmissionDateValue(row: ApplicantRow) {
  const timestamp = getSubmissionTimestamp(row);
  return timestamp ? new Date(timestamp).getTime() : 0;
}

function getSubmissionTimestamp(row: ApplicantRow) {
  return row.test_completed_at ?? row.applied_at;
}

function AcademicScorecard({ row }: { row: ApplicantRow }) {
  const overallPercentage = Math.max(0, Math.min(row.score_percentage ?? 0, 100));
  const correctAnswers = row.score ?? 0;
  const totalQuestions = row.total_questions ?? 0;
  const correctAnswersPercentage = totalQuestions > 0 ? Math.min((correctAnswers / totalQuestions) * 100, 100) : 0;
  const englishCorrect = row.score_english ?? 0;
  const mathCorrect = row.score_math ?? 0;
  const scienceCorrect = row.score_science_evs ?? 0;
  const subjectScaleBase = Math.max(englishCorrect + mathCorrect + scienceCorrect, 1);
  const chartData = [
    { label: "Overall %", value: overallPercentage },
    { label: "Correct", value: correctAnswersPercentage },
    { label: "English", value: Math.min((englishCorrect / subjectScaleBase) * 100, 100) },
    { label: "Math", value: Math.min((mathCorrect / subjectScaleBase) * 100, 100) },
    { label: "Science", value: Math.min((scienceCorrect / subjectScaleBase) * 100, 100) },
  ];
  const metricLegend = [
    { label: "Overall %", value: `${formatPercentage(overallPercentage)}%` },
    { label: "Correct Answers", value: `${formatPercentage(correctAnswersPercentage)}%` },
    { label: "English Correct", value: `${formatPercentage(Math.min((englishCorrect / subjectScaleBase) * 100, 100))}%` },
    { label: "Mathematics Correct", value: `${formatPercentage(Math.min((mathCorrect / subjectScaleBase) * 100, 100))}%` },
    { label: "Science Correct", value: `${formatPercentage(Math.min((scienceCorrect / subjectScaleBase) * 100, 100))}%` },
  ];

  return (
    <div className="flex h-full min-h-[320px] flex-col gap-4">
      <div className="h-[260px] w-full rounded-[24px] border border-blue-100 bg-white/80 px-5 py-4">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} outerRadius="68%">
            <PolarGrid stroke="#cbd5e1" />
            <PolarAngleAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 13, fontWeight: 700 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar dataKey="value" stroke="#2563eb" fill="#2563eb" fillOpacity={0.22} strokeWidth={3} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-2">
        {metricLegend.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-bold text-slate-600">
            <span className="text-slate-500">{item.label}:</span> {item.value}
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm font-bold text-slate-600">
        <span>Correct Answers: {correctAnswers} / {totalQuestions}</span>
        <span className="mx-3 text-slate-300">|</span>
        <span>Overall: {formatPercentage(overallPercentage)}%</span>
      </div>
    </div>
  );
}

function formatPercentage(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
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
