import type { ApplicantStatus } from "@/lib/types";

export function adminVisibleStatus(status: ApplicantStatus): ApplicantStatus {
  if (status === "approved" || status === "rejected") return "test_completed";
  return status;
}

export function formatApplicantStatus(status: ApplicantStatus) {
  if (status === "test_scheduled") return "Scheduled";
  if (status === "test_started") return "Started";
  if (status === "test_completed") return "Completed";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function statusTone(status: ApplicantStatus) {
  if (status === "pending") return "bg-amber-100 text-amber-800 border-amber-200";
  if (status === "test_scheduled") return "bg-sky-100 text-sky-800 border-sky-200";
  if (status === "test_started") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "test_completed") return "bg-violet-100 text-violet-800 border-violet-200";
  if (status === "approved") return "bg-blue-600 text-white border-blue-700";
  return "bg-rose-100 text-rose-800 border-rose-200";
}

export function formatTestCode(code: string | null | undefined) {
  const digits = String(code || "").replace(/\D/g, "");
  if (digits.length !== 9) return code || "—";
  return `${digits.slice(0, 2)}${digits.slice(2, 4)}${digits.slice(4, 6)}${digits.slice(6)}`;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateOnly(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function durationLabel(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return "—";
  const minutes = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
  return `${minutes} min`;
}
