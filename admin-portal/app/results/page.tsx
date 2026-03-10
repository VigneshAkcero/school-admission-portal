"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, ChevronUp, ShieldAlert, Timer, GraduationCap, CheckCircle2, Clock, X } from "lucide-react";
import { getHomePathForRole, useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import type { ApplicantRow } from "@/lib/types";
import { durationLabel, formatDateOnly } from "@/lib/display";
import { formatTestCode } from "@/lib/codeUtils";
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

const QUESTION_MAXES: Record<number, Record<string, number>> = {
  1: { English: 8, Mathematics: 9, EVS: 8, Telugu: 5, Hindi: 9 },
  2: { English: 8, Mathematics: 9, EVS: 8, Telugu: 5, Hindi: 10 },
  3: { English: 8, Mathematics: 9, EVS: 7, Telugu: 5, Hindi: 10 },
  4: { English: 8, Mathematics: 9, EVS: 7, Telugu: 15, Hindi: 8 },
  5: { English: 8, Mathematics: 9, EVS: 7, Telugu: 14, Hindi: 11 },
  6: { English: 8, Mathematics: 9, EVS: 7, Telugu: 13, Hindi: 10 },
  7: { English: 8, Mathematics: 8, Science: 8, Telugu: 7, Hindi: 10 },
  8: { English: 8, Mathematics: 8, Science: 9, Telugu: 7, Hindi: 8 },
  9: { English: 8, Mathematics: 8, Science: 9, Telugu: 7, Hindi: 11 },
};

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
    setResults(
      data.results.filter((row) => ["test_completed", "approved", "rejected"].includes(row.status) || (row.score ?? 0) > 0),
    );
  }

  useEffect(() => {
    if (!token || user?.role !== "principal") return;
    loadResults().catch(() => undefined);
  }, [token, user?.role, grade, search]);

  async function takeDecision(id: string, decision: "approved" | "rejected") {
    if (!token) return;
    const response = await apiRequest<{ id: string; review_status: "approved" | "rejected" }>(`/api/principal/applications/${id}/review`, {
      method: "PATCH",
      token,
      body: { review_status: decision },
    });
    setResults((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              review_status: response.review_status,
              status: response.review_status,
            }
          : row,
      ),
    );
    setSelectedRow((current) => (current && current.id === id ? { ...current, review_status: response.review_status, status: response.review_status } : current));
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
                  const principalStatus =
                    row.review_status === "approved" || row.review_status === "rejected"
                      ? row.review_status
                      : row.status === "approved" || row.status === "rejected"
                        ? row.status
                        : row.status === "test_completed"
                          ? "pending"
                          : row.status;
                  const canReview = row.status === "test_completed" && principalStatus === "pending";
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
                            {Math.round(Math.max(0, Math.min(row.score_percentage ?? 0, 100)))}%
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
                        {canReview ? (
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
                          <span className="text-xs font-bold text-slate-400">No Action</span>
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
              className="w-[min(92vw,1040px)] gap-0 rounded-[28px] border border-slate-200 bg-white p-0 shadow-2xl"
            >
              <DialogHeader className="border-b border-slate-200 px-6 py-5">
                <DialogTitle className="text-xl font-black text-slate-900">{selectedRow.student_name}</DialogTitle>
              </DialogHeader>
              <DialogClose className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900">
                <X className="h-4 w-4" />
              </DialogClose>
              <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[22px] border border-slate-200 bg-white p-5">
                  <h3 className="mb-5 flex items-center gap-2 border-b border-slate-200 pb-4 text-xl font-black text-slate-900">
                    <GraduationCap className="h-5 w-5 text-indigo-500" />
                    Academic Scorecard
                  </h3>
                  <AcademicScorecard row={selectedRow} />
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
                  <h3 className="mb-5 flex items-center gap-2 border-b border-slate-200 pb-4 text-xl font-black text-slate-900">
                    <ShieldAlert className="h-5 w-5 text-blue-600" />
                    Proctoring Compliance
                  </h3>
                  <div className="space-y-3">
                    <DetailRowItem label="Exam Initiation" value={selectedRow.start_time_ist || "-"} icon={<Clock className="h-4 w-4" />} />
                    <DetailRowItem label="Exam Conclusion" value={selectedRow.end_time_ist || "-"} icon={<CheckCircle2 className="h-4 w-4" />} />
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
  const [animateBars, setAnimateBars] = useState(false);
  const grade = row.grade;
  const sciKey = grade >= 7 ? "Science" : "EVS";
  const maxes = QUESTION_MAXES[grade] ?? {};
  const englishTotal = maxes.English ?? 0;
  const mathTotal = maxes.Mathematics ?? 0;
  const scienceTotal = maxes[sciKey] ?? 0;
  const teluguTotal = maxes.Telugu ?? 0;
  const hindiTotal = maxes.Hindi ?? 0;
  const totalQuestions = Object.values(maxes).reduce((sum, value) => sum + value, 0);

  const englishCorrect = Math.max(0, row.score_english ?? 0);
  const mathCorrect = Math.max(0, row.score_math ?? 0);
  const scienceCorrect = Math.max(0, row.score_science_evs ?? 0);
  const teluguCorrect = Math.max(0, row.score_telugu ?? 0);
  const hindiCorrect = Math.max(0, row.score_hindi ?? 0);
  const correctAnswers = englishCorrect + mathCorrect + scienceCorrect + teluguCorrect + hindiCorrect;
  const correctAnswersPercentage =
    totalQuestions > 0 ? Math.max(0, Math.min((correctAnswers / totalQuestions) * 100, 100)) : 0;
  const overallPercentage = correctAnswersPercentage;

  const subjectRows = [
    { label: "English", score: englishCorrect, total: englishTotal, tone: "from-sky-500 to-blue-600" },
    { label: "Mathematics", score: mathCorrect, total: mathTotal, tone: "from-indigo-500 to-indigo-700" },
    { label: sciKey, score: scienceCorrect, total: scienceTotal, tone: "from-emerald-500 to-teal-600" },
    { label: "Telugu", score: teluguCorrect, total: teluguTotal, tone: "from-fuchsia-500 to-violet-600" },
    { label: "Hindi", score: hindiCorrect, total: hindiTotal, tone: "from-rose-500 to-orange-500" },
  ];

  useEffect(() => {
    setAnimateBars(false);
    const frame = window.requestAnimationFrame(() => {
      setAnimateBars(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [row.id]);

  return (
    <div className="flex h-full min-h-[280px] flex-col gap-4">
      <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Overall Score</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{formatPercentage(overallPercentage)}%</p>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-white px-4 py-3 text-right">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-400">Correct Answers</p>
            <p className="mt-1 text-2xl font-black text-violet-900">
              {correctAnswers}
              <span className="text-base text-violet-400"> / {totalQuestions}</span>
            </p>
          </div>
        </div>

        <div className="flex min-h-[220px] items-end justify-between gap-2 overflow-x-auto rounded-[18px] bg-white px-4 py-5">
          {subjectRows.map((item) => {
            const percentage = item.total > 0 ? Math.max(0, Math.min((item.score / item.total) * 100, 100)) : 0;
            return (
              <div key={item.label} className="flex min-w-[78px] flex-1 flex-col items-center gap-2">
                <div className="flex h-[150px] w-full max-w-[54px] items-end rounded-[16px] bg-slate-200 p-1">
                  <div
                    className={`w-full rounded-[12px] bg-gradient-to-t ${item.tone} transition-[height] duration-700 ease-out`}
                    style={{ height: `${animateBars ? (item.score > 0 ? Math.max(percentage, 8) : 0) : 0}%` }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-slate-900">{item.label}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{item.score} / {item.total}</p>
                  <p className="mt-0.5 text-xs font-black text-slate-700">{formatPercentage(percentage)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {subjectRows.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600">
            <span className="text-slate-500">{item.label}:</span> {item.score} / {item.total}
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600">
        <span>Correct Answers: {correctAnswers} / {totalQuestions}</span>
        <span className="mx-3 text-slate-300">|</span>
        <span>Correct %: {formatPercentage(correctAnswersPercentage)}%</span>
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
        "flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
        warning
          ? "border border-rose-100 bg-rose-50 text-rose-700"
          : "border border-slate-200 bg-white text-slate-600"
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
