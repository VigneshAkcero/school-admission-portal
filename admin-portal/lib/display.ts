import type { ApplicantStatus } from "@/lib/types";
import { formatTestCode as formatModernTestCode } from "@/lib/codeUtils";

export function adminVisibleStatus(status: ApplicantStatus): ApplicantStatus {
  if (status === "approved" || status === "rejected") return "test_completed";
  return status;
}

export function formatApplicantStatus(status: ApplicantStatus) {
  if (status === "payment_pending") return "Payment Pending";
  if (status === "paid") return "Paid";
  if (status === "created") return "Created";
  if (status === "started") return "Started";
  if (status === "finished") return "Completed";
  if (status === "test_scheduled") return "Scheduled";
  if (status === "test_started") return "Started";
  if (status === "test_completed") return "Completed";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function statusTone(status: ApplicantStatus) {
  if (status === "payment_pending") return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (status === "paid") return "bg-green-100 text-green-800 border-green-200";
  if (status === "created") return "bg-blue-100 text-blue-800 border-blue-200";
  if (status === "started") return "bg-amber-100 text-amber-800 border-amber-200";
  if (status === "finished") return "bg-violet-100 text-violet-800 border-violet-200";
  if (status === "pending") return "bg-amber-100 text-amber-800 border-amber-200";
  if (status === "test_scheduled") return "bg-sky-100 text-sky-800 border-sky-200";
  if (status === "test_started") return "bg-amber-100 text-amber-800 border-amber-200";
  if (status === "test_completed") return "bg-violet-100 text-violet-800 border-violet-200";
  if (status === "approved") return "bg-blue-600 text-white border-blue-700";
  return "bg-rose-100 text-rose-800 border-rose-200";
}

export function formatTestCode(code: string | null | undefined) {
  return formatModernTestCode(code) || "-";
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateOnly(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function durationLabel(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return "-";
  const minutes = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
  return `${minutes} min`;
}
