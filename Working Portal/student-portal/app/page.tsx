"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, GraduationCap } from "lucide-react";
import { studentApi } from "@/lib/api";
import { saveActiveSession, clearAnswerState, clearSavedResult } from "@/lib/exam-session";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

interface VerifyResponse {
  valid: boolean;
  studentName: string;
  grade: number;
  totalQuestions: number;
  maximumMarks: number;
}

export default function CodeEntryPage() {
  const router = useRouter();
  const [testCode, setTestCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [candidate, setCandidate] = useState<{ studentName: string; grade: number; totalQuestions: number; maximumMarks: number } | null>(null);

  const normalizedCode = testCode.replace(/\D/g, "");

  async function verifyCode() {
    setError("");
    if (normalizedCode.length !== 9) {
      setError("Please enter the complete 9-digit test code.");
      return;
    }

    setIsLoading(true);
    try {
      const data = await studentApi<VerifyResponse>("/api/auth/verify-code", {
        method: "POST",
        body: { testCode: normalizedCode },
      });
      if (!data.valid) {
        setError("This test code is either invalid or has already been used.");
        return;
      }
      setCandidate({
        studentName: data.studentName,
        grade: data.grade,
        totalQuestions: data.totalQuestions,
        maximumMarks: data.maximumMarks,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Security verification failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function startExam() {
    if (!candidate) return;
    setIsLoading(true);
    try {
      clearAnswerState();
      clearSavedResult();
      saveActiveSession({
        testCode: normalizedCode,
        studentName: candidate.studentName,
        grade: candidate.grade,
        durationMinutes: 45,
        totalQuestions: candidate.totalQuestions,
        maximumMarks: candidate.maximumMarks,
        questions: [],
        startedAt: null,
      });
      router.push("/exam");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to initialize exam session");
    } finally {
      setIsLoading(false);
      setCandidate(null);
    }
  }

  return (
    <main className="min-h-screen grid overflow-hidden bg-white lg:grid-cols-[1fr_560px] xl:grid-cols-[1fr_640px]">
      <section className="relative hidden overflow-hidden border-r border-slate-200/70 bg-[linear-gradient(180deg,#f7fbff_0%,#eef5ff_52%,#f3f7fd_100%)] p-12 lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="pointer-events-none absolute left-0 top-0 h-full w-full opacity-70">
          <div className="absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-blue-100/80 blur-[120px]" />
          <div className="absolute bottom-[-12%] right-[-8%] h-[460px] w-[460px] rounded-full bg-sky-100/60 blur-[120px]" />
          <div className="absolute left-[20%] top-[18%] h-[180px] w-[180px] rounded-full bg-white/70 blur-[40px]" />
          <div className="absolute left-[28%] top-[38%] h-[240px] w-[240px] rounded-full bg-blue-50/70 blur-[70px]" />
        </div>

        <div className="relative z-10 max-w-lg text-center text-white">
          <div className="mb-10 inline-flex h-24 w-24 items-center justify-center rounded-[32px] border border-blue-100 bg-white/85 shadow-[0_22px_60px_rgba(59,130,246,0.12)] backdrop-blur-sm">
            <GraduationCap className="h-12 w-12 text-[#4d7fe6]" />
          </div>
          <h1 className="mb-6 text-5xl font-black leading-tight tracking-tight text-slate-900">
            Student Portal
          </h1>
          <p className="text-xl font-bold leading-relaxed text-slate-500">
            Enter your admission test code and continue to your assessment session.
          </p>
        </div>
      </section>

      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-y-auto bg-[linear-gradient(180deg,#f8fbff_0%,#f3f6fb_100%)] px-8 py-12 md:p-12 xl:p-24">
        <div className="w-full max-w-[420px]">
          <div className="mb-12 text-center lg:hidden">
            <h1 className="text-3xl font-black tracking-tight text-[#406fcb]">Student Portal</h1>
          </div>

          <div className="premium-card rounded-[32px] border border-blue-100/70 bg-white/92 p-8 shadow-[0_26px_80px_rgba(148,163,184,0.18)] md:p-10">
            <div className="mb-12 text-center">
              <h2 className="mb-2 text-4xl font-black tracking-tight text-slate-900">Enter Access Code</h2>
              <p className="text-sm font-bold leading-relaxed text-slate-500">
                Enter your 9-digit test code to continue.
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="code" className="ml-1 text-sm font-black text-slate-600">Test Code</Label>
                <Input
                  id="code"
                  value={testCode}
                  onChange={(e) => setTestCode(e.target.value.replace(/\D/g, "").slice(0, 9))}
                  placeholder="Enter 9 digit code"
                  className="h-14 rounded-2xl border-blue-100 bg-slate-50/80 px-6 text-left font-mono text-xl font-bold tracking-[0.05em] text-slate-700 transition-all placeholder:text-slate-400 focus:border-[#6f97ea] focus:bg-white focus:ring-4 focus:ring-[#6f97ea]/10"
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-center text-[11px] font-black uppercase tracking-widest text-rose-600 animate-in">
                  {error}
                </div>
              ) : null}

              <Button
                className="h-14 w-full rounded-2xl border border-[#5b84dc]/35 bg-[linear-gradient(180deg,#6f96e7_0%,#4f78d8_100%)] text-lg font-black text-white shadow-[0_18px_40px_rgba(79,120,216,0.26)] transition-all hover:translate-y-[-1px] hover:bg-[linear-gradient(180deg,#678ee0_0%,#476fd0_100%)] hover:shadow-[0_22px_48px_rgba(79,120,216,0.3)] active:scale-[0.98]"
                onClick={verifyCode}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <span className="flex items-center justify-center gap-3 text-base font-black">
                    Continue
                    <ArrowRight className="h-5 w-5" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={Boolean(candidate)} onOpenChange={(open) => !open && setCandidate(null)}>
        <DialogContent className="w-[95%] max-w-lg overflow-hidden rounded-[32px] border border-blue-100/70 bg-white p-0 shadow-[0_26px_80px_rgba(148,163,184,0.18)]">
          <DialogTitle className="sr-only">Student verification</DialogTitle>
          <DialogDescription className="sr-only">
            Verified student details before continuing to the exam instructions.
          </DialogDescription>
          <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#f7fbff_0%,#eef5ff_100%)] px-8 py-8 text-center">
            <h2 className="mb-2 text-3xl font-black tracking-tight text-slate-900">Welcome</h2>
            <p className="text-lg font-bold text-slate-600">{candidate?.studentName}</p>
            <p className="mt-3 text-sm font-medium text-slate-500">
              Confirm your details and continue to the instruction page.
            </p>
          </div>

          <div className="space-y-4 px-8 py-8">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-slate-100 bg-slate-50 px-5 py-5">
                <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Class Level</span>
                <span className="mt-2 block text-2xl font-black text-slate-900">Grade {candidate?.grade}</span>
              </div>
              <div className="rounded-[24px] border border-slate-100 bg-slate-50 px-5 py-5">
                <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Duration</span>
                <span className="mt-2 block text-2xl font-black text-slate-900">45 Minutes</span>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-slate-100 bg-slate-50 px-5 py-5">
                <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Questions</span>
                <span className="mt-2 block text-2xl font-black text-slate-900">{candidate?.totalQuestions ?? 0}</span>
              </div>
              <div className="rounded-[24px] border border-slate-100 bg-slate-50 px-5 py-5">
                <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Maximum Marks</span>
                <span className="mt-2 block text-2xl font-black text-slate-900">{candidate?.maximumMarks ?? 0}</span>
              </div>
            </div>

            <Button
              className="mt-2 h-14 w-full rounded-2xl border border-[#5b84dc]/35 bg-[linear-gradient(180deg,#6f96e7_0%,#4f78d8_100%)] text-base font-black text-white shadow-[0_18px_40px_rgba(79,120,216,0.26)] transition-all hover:translate-y-[-1px] hover:bg-[linear-gradient(180deg,#678ee0_0%,#476fd0_100%)] hover:shadow-[0_22px_48px_rgba(79,120,216,0.3)] active:scale-[0.98]"
              onClick={startExam}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Continue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
