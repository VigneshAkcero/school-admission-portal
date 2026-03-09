"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Monitor, ShieldCheck, History } from "lucide-react";
import { getStudentWsUrl, studentApi } from "@/lib/api";
import {
  clearActiveSession,
  clearAnswerState,
  getActiveSession,
  getAnswerState,
  getSavedResult,
  saveActiveSession,
  saveAnswerState,
  saveResult,
  type ActiveExamSession,
  type SubmittedResult,
} from "@/lib/exam-session";
import { formatTestCode, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

type Option = "a" | "b" | "c" | "d";
type QuestionState = { selectedOption: Option | null; visited: boolean; markedForReview: boolean };
type ExamPhase = "loading" | "ready_to_share" | "starting" | "instructions" | "exam" | "finished";

function timerClass(seconds: number) {
  if (seconds <= 120) return "text-red-600 animate-pulse";
  if (seconds <= 300) return "text-orange-500";
  return "text-slate-800";
}

function fmt(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function ExamPage() {
  const router = useRouter();
  const [session, setSession] = useState<ActiveExamSession | null>(null);
  const [result, setResult] = useState<SubmittedResult | null>(null);
  const [phase, setPhase] = useState<ExamPhase>("loading");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [states, setStates] = useState<QuestionState[]>([]);
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [allowClose, setAllowClose] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [examStarting, setExamStarting] = useState(false);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [fullscreenMessage, setFullscreenMessage] = useState("");
  const [showScreenShareWarning, setShowScreenShareWarning] = useState(false);
  const [screenShareActive, setScreenShareActive] = useState(false);
  const [screenShareError, setScreenShareError] = useState("");
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const tabSwitchEnabledRef = useRef(false);
  const tabSwitchEnableTimerRef = useRef<number | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const active = getActiveSession();
      const saved = getSavedResult();
      if (saved) {
        if (ignore) return;
        setResult(saved);
        setAllowClose(true);
        setExamFinished(true);
        setPhase("finished");
        return;
      }
      if (!active) {
        router.replace("/");
        return;
      }

      setSession(active);
      const stored = getAnswerState();
      setStates(
        active.questions.map((q) => stored[q.id] || { selectedOption: null, visited: false, markedForReview: false }),
      );
      if (active.startedAt && active.questions.length > 0) {
        const elapsed = Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000);
        setTimeLeft(Math.max(0, (active.durationMinutes || 45) * 60 - elapsed));
        if (!ignore) setPhase("exam");
      } else {
        setTimeLeft((active.durationMinutes || 45) * 60);
        if (!ignore) setPhase("ready_to_share");
      }
    })();

    return () => {
      ignore = true;
    };
  }, [router]);

  useEffect(() => {
    if (!session || phase === "finished") return;
    const ws = new WebSocket(getStudentWsUrl(session.testCode));
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "STUDENT_CONNECT", testCode: session.testCode }));
      if (pcRef.current?.localDescription) {
        ws.send(JSON.stringify({ type: "SCREEN_OFFER", testCode: session.testCode, sdp: pcRef.current.localDescription }));
      }
    };
    ws.onmessage = async (event) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(event.data));
      } catch {
        return;
      }

      if (msg.type === "SCREEN_ANSWER" && msg.sdp && pcRef.current) {
        if (pcRef.current.signalingState === "have-local-offer") {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.sdp as RTCSessionDescriptionInit));
          for (const candidate of pendingIceCandidatesRef.current) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => undefined);
          }
          pendingIceCandidatesRef.current = [];
        }
      }
      if (msg.type === "ICE_CANDIDATE" && msg.candidate && pcRef.current) {
        if (pcRef.current.remoteDescription) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate as RTCIceCandidateInit)).catch(() => undefined);
        } else {
          pendingIceCandidatesRef.current.push(msg.candidate as RTCIceCandidateInit);
        }
      }
      if (msg.type === "REQUEST_SCREEN" && screenStreamRef.current) {
        await setupWebRTC(screenStreamRef.current);
      }
      if (msg.type === "TIME_UP" && !examFinished) {
        setTimeUp(true);
        await submitTest(true);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [session, phase, examFinished]);

  const setupWebRTC = async (stream: MediaStream) => {
    if (!session) return;
    if (pcRef.current) pcRef.current.close();
    pendingIceCandidatesRef.current = [];

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;
    stream.getTracks().forEach((track) => {
      if (track.kind === "video") {
        track.contentHint = "motion";
      }
      const sender = pc.addTrack(track, stream);
      if (track.kind === "video") {
        const parameters = sender.getParameters();
        parameters.encodings = [
          {
            ...(parameters.encodings?.[0] || {}),
            maxBitrate: 350_000,
            maxFramerate: 10,
            scaleResolutionDownBy: 1,
          },
        ];
        sender.setParameters(parameters).catch(() => undefined);
      }
    });
    pc.onicecandidate = (e) => {
      if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ICE_CANDIDATE", testCode: session.testCode, candidate: e.candidate }));
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "SCREEN_OFFER", testCode: session.testCode, sdp: offer }));
    }
  };

  const handleShareAndStart = async () => {
    try {
      tabSwitchEnabledRef.current = false;
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: {
          frameRate: { ideal: 10, max: 12 },
          width: { ideal: 640, max: 854 },
          height: { ideal: 360, max: 480 },
        },
        audio: false,
      });
      screenStreamRef.current = stream;
      setScreenShareActive(true);
      setScreenShareError("");
      stream.getVideoTracks()[0].onended = () => {
        setScreenShareActive(false);
        setShowScreenShareWarning(true);
        void handleShareAndStart();
      };
      setPhase("instructions");
    } catch (error) {
      const err = error as DOMException;
      setPhase("ready_to_share");
      setScreenShareActive(false);
      if (err?.name === "NotAllowedError") {
        setScreenShareError('Screen sharing was denied. Please click "Share Screen & Start Test" again and select a screen to share.');
      } else if (err?.name === "NotSupportedError") {
        setScreenShareError("Screen sharing is not supported in this browser. Please use Chrome or Edge.");
      } else {
        setScreenShareError("Screen sharing failed. Please try again.");
      }
    }
  };

  const handleProceedFromInstructions = async () => {
    if (!session || !screenStreamRef.current) return;
    setExamStarting(true);
    setPhase("starting");
    try {
      const started = await studentApi<{
        testCode: string;
        studentName: string;
        grade: number;
        durationMinutes: number;
        questions: ActiveExamSession["questions"];
      }>("/api/student/start-test", {
        method: "POST",
        body: { testCode: session.testCode },
      });

      setSession((prev) =>
        prev
          ? {
            ...prev,
            testCode: started.testCode,
            studentName: started.studentName,
            grade: started.grade,
            durationMinutes: started.durationMinutes,
            totalQuestions: started.questions.length,
            maximumMarks: started.questions.length,
            questions: started.questions,
            startedAt: new Date().toISOString(),
          }
          : prev,
      );
      saveActiveSession({
        testCode: started.testCode,
        studentName: started.studentName,
        grade: started.grade,
        durationMinutes: started.durationMinutes,
        totalQuestions: started.questions.length,
        maximumMarks: started.questions.length,
        questions: started.questions,
        startedAt: new Date().toISOString(),
      });
      setStates(started.questions.map(() => ({ selectedOption: null, visited: false, markedForReview: false })));
      setCurrentIndex(0);
      setTimeLeft(started.durationMinutes * 60);

      await setupWebRTC(screenStreamRef.current);
      await document.documentElement.requestFullscreen().catch(() => undefined);
      setExamStarted(true);
      setShowScreenShareWarning(false);
      setScreenShareError("");
      setPhase("exam");
      if (tabSwitchEnableTimerRef.current) window.clearTimeout(tabSwitchEnableTimerRef.current);
      tabSwitchEnableTimerRef.current = window.setTimeout(() => {
        tabSwitchEnabledRef.current = true;
      }, 3000);
    } catch {
      setScreenShareError("Failed to start exam. Please try again.");
      setPhase("instructions");
    } finally {
      setExamStarting(false);
    }
  };

  useEffect(() => {
    return () => {
      tabSwitchEnabledRef.current = false;
      if (tabSwitchEnableTimerRef.current) window.clearTimeout(tabSwitchEnableTimerRef.current);
      pcRef.current?.close();
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function reportTabSwitch(reason: "tab_blur" | "visibility_hidden" | "fullscreen_exit") {
    if (!session || !tabSwitchEnabledRef.current) return;
    studentApi("/api/ws/tab-switch", { method: "POST", body: { testCode: session.testCode, reason } }).catch(() => undefined);
    wsRef.current?.send(JSON.stringify({ type: "TAB_SWITCH", testCode: session.testCode, reason }));
  }

  useEffect(() => {
    if (!session || phase === "finished") return;
    const onFullscreenChange = () => {
      if (!tabSwitchEnabledRef.current) return;
      if (!document.fullscreenElement && examStarted && !examFinished) {
        reportTabSwitch("fullscreen_exit");
        setShowFullscreenWarning(true);
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [session, examStarted, examFinished, phase]);

  useEffect(() => {
    if (!session || phase === "finished") return;
    const onVisibility = () => {
      if (!tabSwitchEnabledRef.current) return;
      if (document.hidden) reportTabSwitch("visibility_hidden");
    };
    const onBlur = () => {
      if (!tabSwitchEnabledRef.current) return;
      reportTabSwitch("tab_blur");
    };
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("contextmenu", onContextMenu);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("contextmenu", onContextMenu);
    };
  }, [session, phase]);

  useEffect(() => {
    if (!session || phase !== "exam") return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeUp(true);
          void submitTest(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [session, phase]);

  useEffect(() => {
    if (!session || !states[currentIndex]) return;
    setStates((prev) => {
      const next = [...prev];
      next[currentIndex] = { ...next[currentIndex], visited: true };
      return next;
    });
  }, [currentIndex, session]);

  useEffect(() => {
    if (!session || states.length === 0) return;
    const mapped: Record<string, QuestionState> = {};
    session.questions.forEach((q, idx) => {
      mapped[q.id] = states[idx];
    });
    saveAnswerState(mapped);
  }, [states, session]);

  useEffect(() => {
    if (!result) return;
    const blockBack = () => window.history.pushState(null, "", window.location.href);
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", blockBack);
    const closeTimer = setTimeout(() => setAllowClose(true), 60_000);
    return () => {
      clearTimeout(closeTimer);
      window.removeEventListener("popstate", blockBack);
    };
  }, [result]);

  useEffect(() => {
    if (phase !== "finished") return;
    const timer = window.setTimeout(() => {
      router.replace("/");
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [phase, router]);

  const question = session?.questions[currentIndex];
  const answeredCount = states.filter((s) => s.selectedOption !== null).length;
  const unattemptedCount = states.length - answeredCount;

  const subjectList = useMemo(() => {
    if (!session) return [] as string[];
    const grade = session.grade;
    const base = grade <= 6 ? ["english", "mathematics", "evs"] : ["english", "mathematics", "science"];
    return base.filter((s) => session.questions.some((q) => q.subject.toLowerCase().includes(s === "science" ? "sci" : s.slice(0, 3))));
  }, [session]);

  function findSubjectKey(subject: string) {
    const s = subject.toLowerCase();
    if (s.includes("eng")) return "english";
    if (s.includes("math")) return "mathematics";
    if (s.includes("evs")) return "evs";
    return "science";
  }

  async function saveCurrent(markedForReview?: boolean, selectedOverride?: Option | null) {
    if (!session || !question) return;
    const nextState = {
      ...states[currentIndex],
      selectedOption: selectedOverride !== undefined ? selectedOverride : states[currentIndex].selectedOption,
      markedForReview: markedForReview !== undefined ? markedForReview : states[currentIndex].markedForReview,
      visited: true,
    };
    const nextStates = [...states];
    nextStates[currentIndex] = nextState;
    setStates(nextStates);

    await studentApi("/api/student/save-answer", {
      method: "POST",
      body: {
        testCode: session.testCode,
        questionId: question.id,
        selectedOption: nextState.selectedOption,
        markedForReview: nextState.markedForReview,
        currentQuestionNumber: currentIndex + 1,
        currentSubject: question.subject,
        timeRemainingSeconds: timeLeft,
      },
    });
  }

  async function saveAndMove(nextIdx: number) {
    await saveCurrent();
    setCurrentIndex(nextIdx);
  }

  async function markForReviewAndNext() {
    await saveCurrent(true);
    setCurrentIndex(Math.min((session?.questions.length || 1) - 1, currentIndex + 1));
  }

  async function clearResponse() {
    await saveCurrent(false, null);
  }

  async function submitTest(isTimeout = false) {
    if (!session || submittingRef.current) return;
    submittingRef.current = true;
    tabSwitchEnabledRef.current = false;
    await saveCurrent().catch(() => undefined);
    try {
      const submitted = await studentApi<SubmittedResult>("/api/student/submit-test", {
        method: "POST",
        body: { testCode: session.testCode },
      });
      const finalResult: SubmittedResult = { success: true, timedOut: submitted.timedOut || isTimeout };
      saveResult(finalResult);
      setExamFinished(true);
      setPhase("finished");
      clearActiveSession();
      clearAnswerState();
      setScreenShareActive(false);
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      pcRef.current?.close();
      setResult(finalResult);
    } finally {
      submittingRef.current = false;
    }
  }

  async function returnToFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
      setShowFullscreenWarning(false);
      setFullscreenMessage("");
    } catch {
      setFullscreenMessage("Please press F11 to return to fullscreen.");
      setShowFullscreenWarning(false);
    }
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-gray-500">Verifying test code...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  if (phase === "ready_to_share") {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#eff5ff_52%,#f4f8fd_100%)] px-6 py-10">
        <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl overflow-hidden rounded-[34px] border border-slate-200/70 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.12)] lg:grid-cols-[1fr_560px] xl:grid-cols-[1fr_640px]">
          <section className="relative hidden overflow-hidden border-r border-slate-100 bg-[linear-gradient(180deg,#f7fbff_0%,#eef5ff_52%,#f3f7fd_100%)] p-12 lg:flex lg:flex-col lg:items-center lg:justify-center">
            <div className="pointer-events-none absolute inset-0 opacity-70">
              <div className="absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-blue-100/80 blur-[120px]" />
              <div className="absolute bottom-[-12%] right-[-8%] h-[460px] w-[460px] rounded-full bg-sky-100/60 blur-[120px]" />
            </div>
            <div className="relative z-10 max-w-lg text-center">
              <div className="mb-10 inline-flex h-24 w-24 items-center justify-center rounded-[32px] border border-blue-100 bg-white/85 shadow-[0_22px_60px_rgba(59,130,246,0.12)] backdrop-blur-sm">
                <Monitor className="h-12 w-12 text-[#4d7fe6]" />
              </div>
              <h1 className="mb-6 text-5xl font-black leading-tight tracking-tight text-slate-900">
                Screen Sharing
              </h1>
              <p className="text-xl font-bold leading-relaxed text-slate-500">
                Your exam begins only after screen sharing is enabled and the instructions are accepted.
              </p>
            </div>
          </section>

          <section className="relative flex min-h-full flex-col items-center justify-center bg-[linear-gradient(180deg,#f8fbff_0%,#f3f6fb_100%)] px-8 py-12 md:p-12 xl:p-20">
            <div className="w-full max-w-[460px]">
              <div className="premium-card rounded-[32px] border border-blue-100/70 bg-white/92 p-8 shadow-[0_26px_80px_rgba(148,163,184,0.18)] md:p-10">
                <div className="mb-10 text-center">
                  <h2 className="mb-2 text-4xl font-black tracking-tight text-slate-900">Screen Sharing Required</h2>
                  <p className="text-sm font-bold leading-relaxed text-slate-500">
                    Allow screen sharing to continue to the exam instructions.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-slate-100 bg-slate-50 px-5 py-5">
                    <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Student</span>
                    <span className="mt-2 block text-2xl font-black text-slate-900">{session.studentName}</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[24px] border border-slate-100 bg-slate-50 px-5 py-5">
                      <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Grade</span>
                      <span className="mt-2 block text-xl font-black text-slate-900">{`Grade ${session.grade}`}</span>
                    </div>
                    <div className="rounded-[24px] border border-slate-100 bg-slate-50 px-5 py-5">
                      <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Duration</span>
                      <span className="mt-2 block text-xl font-black text-slate-900">{`${session.durationMinutes || 45} Minutes`}</span>
                    </div>
                  </div>
                  <p className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-4 text-sm font-medium leading-relaxed text-slate-600">
                    Your screen will be visible to the invigilator during the exam. Tab switches and fullscreen exits are tracked automatically.
                  </p>
                  {screenShareError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{screenShareError}</div>
                  ) : null}
                  <button
                    onClick={handleShareAndStart}
                    disabled={examStarting}
                    className="h-14 w-full rounded-2xl border border-[#5b84dc]/35 bg-[linear-gradient(180deg,#6f96e7_0%,#4f78d8_100%)] px-6 text-base font-black text-white shadow-[0_18px_40px_rgba(79,120,216,0.26)] transition-all hover:translate-y-[-1px] hover:bg-[linear-gradient(180deg,#678ee0_0%,#476fd0_100%)] hover:shadow-[0_22px_48px_rgba(79,120,216,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {examStarting ? "Preparing..." : "Share Screen & Continue"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (phase === "instructions" || phase === "starting") {
    return (
      <div className="min-h-screen bg-[#f3f4f6] p-3 md:p-6">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[20px] border border-slate-300 bg-white shadow-sm">
          <div className="border-b bg-slate-100 px-6 py-5">
            <h2 className="text-center text-3xl font-bold text-slate-900">General Instructions</h2>
          </div>

          <div className="overflow-x-auto border-b">
            <table className="w-full min-w-[720px] table-fixed border-collapse text-center">
              <thead>
                <tr className="bg-slate-100 text-sm font-bold text-slate-700">
                  <th className="border px-4 py-3">Total Questions</th>
                  <th className="border px-4 py-3">Total Time (Minutes)</th>
                  <th className="border px-4 py-3">Maximum Marks</th>
                  <th className="border px-4 py-3">Exam Start</th>
                  <th className="border px-4 py-3">Result Declaration</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-sm text-slate-700">
                  <td className="border px-4 py-3">{session.totalQuestions ?? session.questions.length}</td>
                  <td className="border px-4 py-3">{session.durationMinutes || 45}</td>
                  <td className="border px-4 py-3">{session.maximumMarks ?? session.totalQuestions ?? session.questions.length}</td>
                  <td className="border px-4 py-3">Today</td>
                  <td className="border px-4 py-3">By School Review</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-6 px-6 py-8 text-[15px] leading-8 text-slate-700 md:px-10">
            <p>The countdown timer at the top of your screen will display the time remaining for you to complete the exam. When the clock runs out, the exam ends automatically and your test will be submitted.</p>
            <p>The question palette on the right side of the exam screen will show the status of each question.</p>
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2">
              <InstructionLegend label="You have not visited the question yet." color="bg-white border-slate-300" />
              <InstructionLegend label="You have not answered the question." color="bg-[#e4572e] border-[#e4572e]" />
              <InstructionLegend label="You have answered the question." color="bg-[#43a047] border-[#43a047]" />
              <InstructionLegend label="You have marked the question for review." color="bg-[#6f42c1] border-[#6f42c1]" />
              <InstructionLegend label="Answered and marked for review." color="bg-[#395fa8] border-[#395fa8]" />
            </div>
            <div className="space-y-2">
              <p>To answer a question, use the following controls:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li><span className="font-semibold">Save & Next</span> saves your answer and moves to the next question.</li>
                <li><span className="font-semibold">Clear Response</span> removes the selected answer.</li>
                <li><span className="font-semibold">Save & Mark for Review</span> saves your answer and marks it for review.</li>
                <li><span className="font-semibold">Mark for Review & Next</span> marks the question for review and moves ahead.</li>
              </ul>
            </div>
            <p>Questions saved and marked for review will be considered for evaluation. Every tab switch and fullscreen exit is tracked and reported to the invigilator. Results are not shown to students after submission.</p>
          </div>

          <div className="flex flex-col gap-4 border-t bg-slate-50 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={instructionsAccepted}
                onChange={(e) => setInstructionsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <span>I have read and understood the instructions. I agree to follow the exam rules.</span>
            </label>
            <button
              onClick={handleProceedFromInstructions}
              disabled={phase === "starting" || !instructionsAccepted}
              className="rounded-lg bg-[#3d6cb0] px-8 py-3 text-base font-bold text-white transition-colors hover:bg-[#335f9d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {phase === "starting" ? "Starting exam..." : "Start Test"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "finished" && result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-xl">
          <div className="mb-6 text-6xl">Submitted</div>
          <h2 className="mb-3 text-2xl font-bold text-gray-900">Thanks for submitting your test</h2>
          <p className="mb-6 leading-relaxed text-gray-600">
            Thank you for appearing for the admission test.
            <br />
            Your results will be evaluated and shared by the school shortly.
          </p>
          <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
            <p>
              Student: <strong className="text-gray-700">{session.studentName}</strong>
            </p>
            <p>
              Grade Applied: <strong className="text-gray-700">{`Grade ${session.grade}`}</strong>
            </p>
            <p>
              Test Code: <strong className="font-mono text-gray-700">{formatTestCode(session.testCode)}</strong>
            </p>
          </div>
          <p className="mt-6 text-xs text-gray-400">Returning to home page in 10 seconds.</p>
        </div>
      </div>
    );
  }

  if (!question || phase !== "exam") return null;

  const passage =
    question.questionType === "comprehension"
      ? question.passageText ||
      session.questions.find((q) => q.passageGroup && q.passageGroup === question.passageGroup && q.passageText)?.passageText ||
      null
      : null;

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      {showScreenShareWarning ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="max-w-md premium-card text-center bg-white shadow-2xl">
            <Monitor className="mx-auto mb-4 h-12 w-12 text-primary" />
            <p className="text-xl font-black text-slate-900">Screen Sharing Protocol</p>
            <p className="mb-6 text-sm font-medium text-slate-500">Your screen must be visible to the invigilator to continue the session.</p>
            {screenShareError ? <p className="mb-4 text-xs font-bold text-rose-600">{screenShareError}</p> : null}
            <Button
              onClick={handleShareAndStart}
              disabled={examStarting}
              className="h-12 w-full rounded-2xl bg-primary text-white hover:bg-indigo-700 font-black"
            >
              {examStarting ? "Initializing..." : "Enable Screen Share"}
            </Button>
          </div>
        </div>
      ) : null}

      {showFullscreenWarning ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-rose-900/40 backdrop-blur-lg p-4">
          <div className="max-w-md premium-card text-center bg-white shadow-2xl">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-rose-600" />
            <p className="text-xl font-black text-slate-900">Security Breach Alert</p>
            <p className="mb-6 text-sm font-medium text-slate-500 leading-relaxed">
              You have exited the secure fullscreen environment. This event has been logged and the proctor has been notified.
            </p>
            <Button className="h-12 w-full rounded-2xl bg-rose-600 text-white hover:bg-rose-700 font-black shadow-lg shadow-rose-600/20" onClick={returnToFullscreen}>
              Return to Secured Mode
            </Button>
          </div>
        </div>
      ) : null}

      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="grid gap-1 text-sm text-slate-700">
            <p><span className="font-semibold text-slate-900">Candidate Name:</span> {session.studentName}</p>
            <p><span className="font-semibold text-slate-900">Exam Name:</span> School Admission Test</p>
            <p><span className="font-semibold text-slate-900">Test Code:</span> {formatTestCode(session.testCode)}</p>
            <p><span className="font-semibold text-slate-900">Current Subject:</span> {question.subject}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-right lg:mt-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Remaining Time</p>
            <div className={cn("text-3xl font-black", timerClass(timeLeft))}>{fmt(timeLeft)}</div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[16px] border border-slate-300 bg-white shadow-sm">
            <div className="flex flex-wrap gap-2 border-b bg-slate-50 px-5 py-4">
              {subjectList.map((subject) => {
                const label =
                  subject === "english" ? "English" : subject === "mathematics" ? "Mathematics" : subject === "evs" ? "EVS" : "Science";
                const matchingIndexes = session.questions
                  .map((q, i) => ({ key: findSubjectKey(q.subject), i }))
                  .filter((item) => item.key === subject)
                  .map((item) => item.i);
                const active = findSubjectKey(question.subject) === subject;
                return (
                  <button
                    key={subject}
                    className={cn(
                      "rounded-md border px-5 py-2 text-[11px] font-bold transition-all",
                      active
                        ? "border-[#3d6cb0] bg-[#3d6cb0] text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    )}
                    onClick={() => matchingIndexes.length > 0 && setCurrentIndex(matchingIndexes[0])}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="space-y-6 p-6">
              <div className="border-b border-slate-200 pb-3">
                <h4 className="text-2xl font-bold text-slate-900">{`Question ${currentIndex + 1}:`}</h4>
              </div>

              <div className="max-h-[calc(100vh-420px)] min-h-[360px] space-y-6 overflow-y-auto pr-2">
                {passage ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm italic leading-relaxed text-slate-700">
                    <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <History className="h-3 w-3" />
                      Reference Passage
                    </p>
                    {passage}
                  </div>
                ) : null}

                <div className="min-h-[160px] rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-xl font-medium leading-snug text-slate-900">{question.questionText}</p>
                </div>

                <div className="grid gap-4">
                  {(["a", "b", "c", "d"] as Option[]).map((option) => (
                    <button
                      key={option}
                      className={cn(
                        "group relative w-full rounded-lg border p-4 text-left transition-all duration-200",
                        states[currentIndex]?.selectedOption === option
                          ? "border-[#3d6cb0] bg-blue-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      )}
                      onClick={() =>
                        setStates((prev) => {
                          const next = [...prev];
                          next[currentIndex] = { ...next[currentIndex], selectedOption: option, visited: true };
                          return next;
                        })
                      }
                    >
                      <div className="flex items-center gap-5">
                        <div className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-md font-bold text-sm transition-all duration-200",
                          states[currentIndex]?.selectedOption === option
                            ? "bg-[#3d6cb0] text-white"
                            : "bg-slate-100 text-slate-500"
                        )}>
                          {option.toUpperCase()}
                        </div>
                        <span className={cn(
                          "text-lg font-bold transition-all duration-300",
                          states[currentIndex]?.selectedOption === option ? "text-slate-900" : "text-slate-600 group-hover:text-slate-900"
                        )}>
                          {question.options[option]}
                        </span>
                        {states[currentIndex]?.selectedOption === option && (
                          <div className="ml-auto h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 border-t border-slate-200 pt-4">
                <div className="flex flex-wrap gap-3">
                  <Button
                    className="h-11 rounded-md bg-[#4caf50] px-5 font-bold text-white hover:bg-[#449d48]"
                    onClick={() => saveAndMove(Math.min(session.questions.length - 1, currentIndex + 1))}
                  >
                    Save & Next
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 rounded-md border-slate-300 px-5 font-bold text-slate-700"
                    onClick={clearResponse}
                  >
                    Clear Response
                  </Button>
                  <Button
                    className="h-11 rounded-md bg-[#d9a441] px-5 font-bold text-white hover:bg-[#c39131]"
                    onClick={() => saveCurrent(true)}
                  >
                    Save & Mark for Review
                  </Button>
                  <Button
                    className="h-11 rounded-md bg-[#3d6cb0] px-5 font-bold text-white hover:bg-[#335f9d]"
                    onClick={markForReviewAndNext}
                  >
                    Mark for Review & Next
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="h-10 rounded-md border-slate-300 px-5 font-bold text-slate-700"
                      disabled={currentIndex === 0}
                      onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                    >
                      &lt;&lt; Back
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 rounded-md border-slate-300 px-5 font-bold text-slate-700"
                      disabled={currentIndex === session.questions.length - 1}
                      onClick={() => setCurrentIndex(Math.min(session.questions.length - 1, currentIndex + 1))}
                    >
                      Next &gt;&gt;
                    </Button>
                  </div>
                  <Button
                    className="h-10 rounded-md bg-[#4caf50] px-7 font-bold text-white hover:bg-[#449d48]"
                    onClick={() => setShowSubmitDialog(true)}
                  >
                    Submit
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-20 lg:pt-24">
          <div className="overflow-hidden rounded-[16px] border border-slate-300 bg-white p-5 shadow-sm">
            <div className="mb-6 rounded-lg border-2 border-dashed border-slate-400 p-4">
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-700">
                <PaletteLegend label="Not Visited" color="bg-white border-slate-300" />
                <PaletteLegend label="Not Answered" color="bg-[#e4572e] border-[#e4572e]" />
                <PaletteLegend label="Answered" color="bg-[#43a047] border-[#43a047]" />
                <PaletteLegend label="Marked for Review" color="bg-[#6f42c1] border-[#6f42c1]" />
                <PaletteLegend label="Answered & Marked for Review" color="bg-[#395fa8] border-[#395fa8]" className="col-span-2" />
              </div>
            </div>

            {timeUp && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4 text-rose-600 animate-in">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-sm font-bold uppercase tracking-tight">Time Exhausted</p>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h5 className="text-sm font-bold uppercase tracking-widest text-slate-900">Question Palette</h5>
                  <p className="text-[11px] font-bold text-slate-500">{answeredCount}/{states.length} Answered</p>
                </div>
                <div className="max-h-[420px] overflow-auto pr-2">
                  <div className="grid grid-cols-5 gap-2">
                    {session.questions.map((q, idx) => {
                      const state = states[idx];
                      const active = idx === currentIndex;

                      let colorClass = "bg-white border-slate-100 text-slate-300 hover:border-slate-300";
                      const isAnswered = !!state?.selectedOption;
                      const isMarked = !!state?.markedForReview;
                      const isVisited = !!state?.visited;

                      if (isAnswered && isMarked) colorClass = "bg-[#395fa8] border-[#395fa8] text-white";
                      else if (isMarked) colorClass = "bg-[#6f42c1] border-[#6f42c1] text-white";
                      else if (isAnswered) colorClass = "bg-[#43a047] border-[#43a047] text-white";
                      else if (isVisited) colorClass = "bg-[#e4572e] border-[#e4572e] text-white";

                      return (
                        <button
                          key={q.id}
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-md border text-[12px] font-bold transition-all duration-200",
                            colorClass,
                            active && "ring-2 ring-slate-900 ring-offset-1"
                          )}
                          onClick={() => setCurrentIndex(idx)}
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                <p>Not Answered: <span className="font-bold">{unattemptedCount}</span></p>
                <p>Answered: <span className="font-bold">{answeredCount}</span></p>
                <p>Marked for Review: <span className="font-bold">{states.filter((s) => s.markedForReview).length}</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="glass rounded-[32px] border-none p-10 overflow-hidden sm:max-w-[480px] bg-white text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <AlertDialogTitle className="text-2xl font-black tracking-tight text-slate-900">Final Submission</AlertDialogTitle>
          <AlertDialogDescription className="mt-4 text-base font-medium text-slate-500 leading-relaxed">
            {`You have answered ${answeredCount} of ${session.questions.length} questions. Once submitted, your answers will be locked for final evaluation.`}
          </AlertDialogDescription>
          <div className="mt-10 flex gap-4">
            <AlertDialogCancel className="h-12 flex-1 rounded-xl border-slate-200 bg-white font-bold text-slate-600 hover:bg-slate-50">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-12 flex-1 rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10"
              onClick={() => submitTest(false)}
            >
              Confirm Submit
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PaletteLegend({ label, color, className }: { label: string; color: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("h-4 w-4 rounded-sm border shadow-sm", color)} />
      <span className="text-[12px] font-medium text-slate-700">{label}</span>
    </div>
  );
}

function InstructionLegend({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("h-5 w-5 rounded-sm border", color)} />
      <span className="text-sm text-slate-700">{label}</span>
    </div>
  );
}
