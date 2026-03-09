"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Monitor, ShieldAlert, Clock, Play } from "lucide-react";
import { getHomePathForRole, useAuth } from "@/lib/auth-context";
import { apiRequest, getWsUrl } from "@/lib/api";
import type { MonitorSession } from "@/lib/types";
import { formatTestCode } from "@/lib/display";
import { SchoolShell } from "@/components/school-shell";
import { cn } from "@/lib/utils";

type SessionWithExtras = MonitorSession & {
  currentQuestionIndex: number;
  subject: string;
  timeRemainingSeconds: number;
  timeline: string[];
  subjectAnsweredCount: number;
  subjectTotalQuestions: number;
};

function formatClock(seconds: number) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function deriveTimeRemaining(startTime: string | null, durationSeconds = 45 * 60) {
  if (!startTime) return durationSeconds;
  const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
  return Math.max(0, durationSeconds - elapsed);
}

function normalizeSubjectKey(subject: string) {
  const value = subject.toLowerCase();
  if (value.includes("math")) return "mathematics";
  if (value.includes("eng")) return "english";
  if (value.includes("evs")) return "evs";
  if (value.includes("sci")) return "science";
  return "";
}

export default function SessionMonitorPage() {
  const router = useRouter();
  const { user, token, isReady } = useAuth();
  const [sessionsByCode, setSessionsByCode] = useState<Record<string, SessionWithExtras>>({});
  const [streamMap, setStreamMap] = useState<Record<string, MediaStream>>({});
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);

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

  useEffect(() => {
    if (!token || user?.role !== "admin") return;
    async function load() {
      const [sessionData, switchData] = await Promise.all([
        apiRequest<{ sessions: MonitorSession[] }>("/api/admin/active-sessions", { token }),
        apiRequest<{ events: Array<{ test_code: string; switched_at: string }> }>("/api/admin/tab-switches", { token }),
      ]);

      const switchMap = switchData.events.reduce<Record<string, string[]>>((acc, event) => {
        if (!acc[event.test_code]) acc[event.test_code] = [];
        acc[event.test_code].push(event.switched_at);
        return acc;
      }, {});

      setSessionsByCode(() => {
        const next: Record<string, SessionWithExtras> = {};
        sessionData.sessions.forEach((session) => {
          next[session.test_code] = {
            ...session,
            currentQuestionIndex: 1,
            subject: "Awaiting activity",
            timeRemainingSeconds: deriveTimeRemaining(session.start_time),
            timeline: switchMap[session.test_code] || [],
            subjectAnsweredCount: 0,
            subjectTotalQuestions: 0,
          };
        });
        return next;
      });
    }

    load().catch(() => undefined);
  }, [token, user?.role]);

  useEffect(() => {
    if (!token || user?.role !== "admin") return;
    const ws = new WebSocket(getWsUrl("ADMIN_MONITOR"));
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: "ADMIN_SUBSCRIBE" }));
    ws.onmessage = async (event) => {
      let parsed: Record<string, any>;
      try {
        parsed = JSON.parse(String(event.data));
      } catch {
        return;
      }

      const type = String(parsed.type || "");
      const testCode = String(parsed.testCode || "");

      if (type === "SCREEN_OFFER" && testCode && parsed.sdp) {
        let pc = peerConnectionsRef.current.get(testCode);
        if (!pc) {
          pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          });
          peerConnectionsRef.current.set(testCode, pc);
          pc.ontrack = (streamEvent) => {
            const stream = streamEvent.streams?.[0];
            if (!stream) return;
            setStreamMap((prev) => ({ ...prev, [testCode]: stream }));
          };
          pc.onicecandidate = (candidateEvent) => {
            if (candidateEvent.candidate && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ICE_CANDIDATE", testCode, candidate: candidateEvent.candidate }));
            }
          };
        }

        await pc.setRemoteDescription(new RTCSessionDescription(parsed.sdp as RTCSessionDescriptionInit)).catch(() => undefined);
        const answer = await pc.createAnswer().catch(() => null);
        if (!answer) return;
        await pc.setLocalDescription(answer).catch(() => undefined);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "SCREEN_ANSWER", testCode, sdp: answer }));
        }
      }

      if (type === "ICE_CANDIDATE" && testCode && parsed.candidate) {
        const pc = peerConnectionsRef.current.get(testCode);
        pc?.addIceCandidate(new RTCIceCandidate(parsed.candidate as RTCIceCandidateInit)).catch(() => undefined);
      }

      if (type === "TAB_SWITCH" && testCode) {
        setSessionsByCode((prev) => {
          const existing = prev[testCode];
          if (!existing) return prev;
          return {
            ...prev,
            [testCode]: {
              ...existing,
              tab_switch_count: Number(parsed.count || existing.tab_switch_count || 0),
              timeline: [String(parsed.switchedAt || new Date().toISOString()), ...(existing.timeline || [])].slice(0, 20),
            },
          };
        });
      }

      if (type === "STUDENT_PROGRESS" && testCode) {
        setSessionsByCode((prev) => {
          const existing = prev[testCode];
          if (!existing) return prev;
          const subjectKey = normalizeSubjectKey(String(parsed.subject || existing.subject || ""));
          const answeredInSubject = Number(parsed.answeredCountInSubject || existing.subjectAnsweredCount || 0);
          const totalInSubject = Number(parsed.totalQuestionsInSubject || existing.subjectTotalQuestions || 0);

          const subjectPatch =
            subjectKey === "english"
              ? { english_answered: answeredInSubject, english_total: totalInSubject }
              : subjectKey === "mathematics"
                ? { mathematics_answered: answeredInSubject, mathematics_total: totalInSubject }
                : subjectKey === "evs"
                  ? { evs_answered: answeredInSubject, evs_total: totalInSubject }
                  : subjectKey === "science"
                    ? { science_answered: answeredInSubject, science_total: totalInSubject }
                    : {};

          return {
            ...prev,
            [testCode]: {
              ...existing,
              currentQuestionIndex: Number(parsed.currentQuestionIndex || existing.currentQuestionIndex || 1),
              subject: String(parsed.subject || existing.subject || "English"),
              answered_count: Number(parsed.answeredCount || existing.answered_count || 0),
              marked_count: Number(parsed.markedCount || existing.marked_count || 0),
              total_questions: Number(parsed.totalQuestions || existing.total_questions || 45),
              timeRemainingSeconds: Number(parsed.timeRemainingSeconds || existing.timeRemainingSeconds || 0),
              tab_switch_count: Number(parsed.tabSwitchCount || existing.tab_switch_count || 0),
              subjectAnsweredCount: answeredInSubject,
              subjectTotalQuestions: totalInSubject,
              ...subjectPatch,
            },
          };
        });
      }

      if (type === "STUDENT_FINISHED" && testCode) {
        peerConnectionsRef.current.get(testCode)?.close();
        peerConnectionsRef.current.delete(testCode);
        setStreamMap((prev) => {
          const next = { ...prev };
          delete next[testCode];
          return next;
        });
        setSessionsByCode((prev) => {
          const next = { ...prev };
          delete next[testCode];
          return next;
        });
      }
    };

    return () => {
      ws.close();
      for (const pc of peerConnectionsRef.current.values()) pc.close();
      peerConnectionsRef.current.clear();
      setStreamMap({});
    };
  }, [token, user?.role]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionsByCode((prev) => {
        const next: Record<string, SessionWithExtras> = {};
        for (const [key, value] of Object.entries(prev)) {
          next[key] = {
            ...value,
            timeRemainingSeconds: Math.max(0, value.timeRemainingSeconds - 1),
          };
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const sessions = useMemo(
    () =>
      Object.values(sessionsByCode).sort(
        (a, b) => new Date(a.start_time || 0).getTime() - new Date(b.start_time || 0).getTime(),
      ),
    [sessionsByCode],
  );

  useEffect(() => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    sessions.forEach((session) => {
      wsRef.current?.send(JSON.stringify({ type: "REQUEST_SCREEN", testCode: session.test_code }));
    });
  }, [sessions]);

  if (!user || user.role !== "admin") return null;

  return (
    <SchoolShell
      title="Session Monitor"
      subtitle="Live student screens with code, grade, remaining time, and subject-wise progress."
    >
      <section className="space-y-6">
        <div className="rounded-[24px] border border-slate-100 bg-white px-6 py-5 shadow-sm">
          <p className="text-sm font-bold text-slate-700">{sessions.length} live students</p>
        </div>
        {sessions.length ? (
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(300px,440px))]">
            {sessions.map((session) => (
              <div key={session.test_code} className="w-full max-w-[440px] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                <div className="aspect-[16/9] max-h-[240px] overflow-hidden bg-slate-950">
                  {streamMap[session.test_code] ? (
                    <video
                      autoPlay
                      playsInline
                      muted
                      ref={(node) => {
                        if (node && node.srcObject !== streamMap[session.test_code]) {
                          node.srcObject = streamMap[session.test_code];
                        }
                      }}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[#0a0e17]">
                      <div className="text-center">
                        <Monitor className="mx-auto mb-4 h-12 w-12 animate-pulse text-slate-700" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Connecting screen</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-4 px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-black text-slate-900">{session.student_name}</p>
                    </div>
                    <div className="text-right text-[11px] font-bold text-slate-500">
                      {formatClock(session.timeRemainingSeconds)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[12px] font-medium text-slate-700">
                    <span><span className="font-black text-slate-900">Code:</span> {formatTestCode(session.test_code)}</span>
                    <span><span className="font-black text-slate-900">Grade:</span> {session.grade}</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Maths", answered: session.mathematics_answered || 0, total: session.mathematics_total || 0, tone: "bg-blue-500" },
                      { label: "EVS", answered: session.evs_answered || 0, total: session.evs_total || 0, tone: "bg-emerald-500" },
                      { label: "Science", answered: session.science_answered || 0, total: session.science_total || 0, tone: "bg-violet-500" },
                      { label: "English", answered: session.english_answered || 0, total: session.english_total || 0, tone: "bg-amber-500" },
                    ]
                      .filter((subject) => subject.total > 0)
                      .map((subject) => (
                        <SubjectProgress
                          key={subject.label}
                          label={subject.label}
                          answered={subject.answered}
                          total={subject.total}
                          tone={subject.tone}
                        />
                      ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[12px]">
                    <span className="font-medium text-slate-600">Tab switches: <span className={cn("font-black", session.tab_switch_count > 0 ? "text-rose-600" : "text-slate-900")}>{session.tab_switch_count}</span></span>
                    <span className="font-medium text-slate-600">Q{session.currentQuestionIndex}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[480px] items-center justify-center rounded-[32px] border-2 border-dashed border-slate-200 bg-white">
            <div className="text-center">
              <Play className="mx-auto mb-4 h-10 w-10 text-slate-300" />
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Waiting for active students</p>
            </div>
          </div>
        )}
      </section>
    </SchoolShell>
  );
}

function SubjectProgress({ label, answered, total, tone }: { label: string; answered: number; total: number; tone: string }) {
  const percent = total > 0 ? Math.min(100, Math.round((answered / total) * 100)) : 0;
  return (
    <div className="grid grid-cols-[70px_1fr_auto] items-center gap-3 text-[12px]">
      <span className="font-medium text-slate-700">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${percent}%` }} />
      </div>
      <span className="min-w-[52px] text-right font-medium text-slate-700">{answered}/{total}</span>
    </div>
  );
}
