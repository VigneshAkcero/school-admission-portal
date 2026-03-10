"use client";

import { cn } from "@/lib/utils";
import { formatApplicantStatus, statusTone } from "@/lib/display";
import type { ApplicantStatus } from "@/lib/types";

export function StatusPill({ status, className }: { status: ApplicantStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide",
        statusTone(status),
        className,
      )}
    >
      {formatApplicantStatus(status)}
    </span>
  );
}
