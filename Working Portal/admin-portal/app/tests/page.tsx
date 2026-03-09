"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MonitorSmartphone } from "lucide-react";
import { getHomePathForRole, useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { useAlerts } from "@/lib/alerts-context";
import type { ApplicantRow } from "@/lib/types";
import { durationLabel, formatDateTime, formatTestCode } from "@/lib/display";
import { cn } from "@/lib/utils";
import { SchoolShell } from "@/components/school-shell";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";

interface TestsResponse {
  scheduled: ApplicantRow[];
  active: ApplicantRow[];
  completed: ApplicantRow[];
}

function formatTimeOnly(value: string | null | undefined) {
  if (!value) return "—";
  const parts = formatDateTime(value).split(",");
  return parts[1]?.trim() || "—";
}

function SectionCard({
  title,
  badge,
  children,
  action,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">{title}</h2>
          {badge ? (
            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{badge}</div>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-500">{label}</div>;
}

function TestsTable({
  rows,
  columns,
  highlightCodes,
  codeTone = "amber",
}: {
  rows: ApplicantRow[];
  columns: Array<{ key: string; label: string; className?: string }>;
  highlightCodes?: Set<string>;
  codeTone?: "amber" | "blue" | "green";
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
      <div className="overflow-x-hidden">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] font-black uppercase tracking-[0.16em] text-slate-900">
              {columns.map((column) => (
                <th key={column.key} className={cn("px-6 py-5", column.className)}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((applicant) => {
              const highlighted = highlightCodes?.has(String(applicant.test_code || ""));
              return (
                <tr key={applicant.id} className={cn("text-[13px] transition-colors", highlighted && "bg-red-50/60")}>
                  {columns.map((column) => {
                    if (column.key === "name") {
                      return (
                        <td key={column.key} className="px-6 py-5 font-medium text-slate-900">
                          {applicant.student_name}
                        </td>
                      );
                    }
                    if (column.key === "grade") {
                      return (
                        <td key={column.key} className="px-6 py-5 font-normal text-slate-800">
                          {`Grade ${applicant.grade}`}
                        </td>
                      );
                    }
                    if (column.key === "parent") {
                      return (
                        <td key={column.key} className="px-6 py-5 font-normal text-slate-800">
                          {applicant.parent_name}
                        </td>
                      );
                    }
                    if (column.key === "date") {
                      return (
                        <td key={column.key} className="px-6 py-5 font-normal text-slate-700">
                          {formatDateTime(applicant.applied_at).split(",")[0]}
                        </td>
                      );
                    }
                    if (column.key === "code") {
                      const toneClass =
                        codeTone === "blue"
                          ? "bg-blue-100 text-blue-800"
                          : codeTone === "green"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-900";
                      return (
                        <td key={column.key} className="px-6 py-5 text-center">
                          <span className={cn("inline-flex rounded-full px-3 py-1 font-mono text-[12px] font-semibold", toneClass)}>
                            {formatTestCode(applicant.test_code)}
                          </span>
                        </td>
                      );
                    }
                    if (column.key === "status") {
                      return (
                        <td key={column.key} className="px-6 py-5 text-center">
                          <StatusPill status={applicant.status} className="px-2 py-0.5 text-[10px] font-bold tracking-normal" />
                        </td>
                      );
                    }
                    if (column.key === "start") {
                      return (
                        <td key={column.key} className="px-6 py-5 font-normal text-slate-700">
                          {formatTimeOnly(applicant.start_time || applicant.test_started_at)}
                        </td>
                      );
                    }
                    if (column.key === "switches") {
                      return (
                        <td key={column.key} className="px-6 py-5 font-normal text-slate-700">
                          <span className={cn((applicant.total_tab_switches ?? 0) > 0 ? "text-rose-500" : "text-slate-700")}>
                            {applicant.total_tab_switches ?? 0}
                          </span>
                        </td>
                      );
                    }
                    if (column.key === "end") {
                      return (
                        <td key={column.key} className="px-6 py-5 font-normal text-slate-700">
                          {formatTimeOnly(applicant.end_time || applicant.test_completed_at)}
                        </td>
                      );
                    }
                    if (column.key === "duration") {
                      return (
                        <td key={column.key} className="px-6 py-5 font-normal text-slate-700">
                          {durationLabel(applicant.start_time || applicant.test_started_at, applicant.end_time || applicant.test_completed_at)}
                        </td>
                      );
                    }
                    return <td key={column.key} className="px-6 py-5" />;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TestsPage() {
  const router = useRouter();
  const { user, token, isReady } = useAuth();
  const { events } = useAlerts();
  const [data, setData] = useState<TestsResponse>({ scheduled: [], active: [], completed: [] });

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
    const response = await apiRequest<TestsResponse>("/api/admin/tests", { token });
    setData(response);
  }

  useEffect(() => {
    if (!token || user?.role !== "admin") return;
    let cancelled = false;
    const loadSafe = async () => {
      const response = await apiRequest<TestsResponse>("/api/admin/tests", { token });
      if (!cancelled) setData(response);
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

  const recentSwitchMap = useMemo(() => {
    const now = Date.now();
    return new Set(
      events
        .filter((event) => now - new Date(event.switchedAt).getTime() < 2000)
        .map((event) => event.testCode),
    );
  }, [events]);

  if (!user || user.role !== "admin") return null;

  return (
    <SchoolShell title="Tests">
      <section className="space-y-8">
        <SectionCard title="Scheduled Tests" badge={`${data.scheduled.length} queued`}>
          {data.scheduled.length ? (
            <TestsTable
              rows={data.scheduled}
              columns={[
                { key: "name", label: "Name" },
                { key: "parent", label: "Parent Name" },
                { key: "grade", label: "Grade" },
                { key: "date", label: "Date" },
                { key: "code", label: "Code", className: "text-center" },
              ]}
            />
          ) : (
            <EmptyState label="No scheduled tests right now." />
          )}
        </SectionCard>

        <SectionCard
          title="Active Tests"
          action={
            <Link href="/session-monitor">
              <Button className="rounded-2xl bg-blue-600 px-5 text-white hover:bg-blue-700">
                <MonitorSmartphone className="mr-2 h-4 w-4" />
                Session Monitor
              </Button>
            </Link>
          }
        >
          {data.active.length ? (
            <TestsTable
              rows={data.active}
              highlightCodes={recentSwitchMap}
              columns={[
                { key: "name", label: "Name" },
                { key: "grade", label: "Grade" },
                { key: "code", label: "Code", className: "text-center" },
                { key: "start", label: "Start Time" },
                { key: "switches", label: "Tab Switches" },
              ]}
              codeTone="blue"
            />
          ) : (
            <EmptyState label="No active tests at the moment." />
          )}
        </SectionCard>

        <SectionCard title="Completed Tests" badge={`${data.completed.length} sessions`}>
          {data.completed.length ? (
            <TestsTable
              rows={data.completed}
              columns={[
                { key: "name", label: "Name" },
                { key: "grade", label: "Grade" },
                { key: "code", label: "Code", className: "text-center" },
                { key: "start", label: "Start Time" },
                { key: "switches", label: "Tab Switches" },
                { key: "end", label: "End Time" },
                { key: "duration", label: "Duration" },
              ]}
              codeTone="green"
            />
          ) : (
            <EmptyState label="No completed tests yet." />
          )}
        </SectionCard>
      </section>
    </SchoolShell>
  );
}
