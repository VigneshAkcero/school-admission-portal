"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  accent,
  helper,
  icon,
  className,
}: {
  label: string;
  value: string | number;
  accent?: string;
  helper?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "premium-card relative flex h-full min-h-[168px] flex-col justify-between overflow-hidden group hover:bg-white/80 transition-all duration-500",
        className,
      )}
    >
      {/* Background Accent Glow */}
      <div className={cn("absolute right-0 top-0 h-28 w-28 blur-[70px] opacity-10 transition-opacity group-hover:opacity-25", accent || "bg-primary")} />

      <div className="relative z-10">
        <div className="mb-6 flex items-center gap-3">
          {icon ? (
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-sm transition-all duration-500 group-hover:scale-105 group-hover:shadow-lg", accent || "bg-primary")}>
              {icon}
            </div>
          ) : null}
          <p className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 leading-none">{label}</p>
        </div>
        <div className="text-4xl font-black leading-none tracking-tight text-slate-900 drop-shadow-sm md:text-[2.9rem]">{value}</div>
      </div>
      {helper && <p className="mt-5 text-[10px] font-bold leading-relaxed uppercase tracking-[0.24em] text-slate-400">{helper}</p>}
    </div>
  );
}
