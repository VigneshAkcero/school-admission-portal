"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Printer } from "lucide-react";
import { GRADE_LABELS, formatRegCode } from "@/lib/codeUtils";

function resolveApiBase() {
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envBase) return envBase;
  if (typeof window === "undefined") return "http://localhost:4000";
  const { hostname, protocol } = window.location;
  return `${protocol === "https:" ? "https:" : "http:"}//${hostname}:4000`;
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem" }}>Loading...</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}

function ConfirmationContent() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const mobile = params.get("mobile");
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !mobile) {
      router.replace("/");
      return;
    }

    fetch(`${resolveApiBase()}/api/parent/application/${id}?mobile=${encodeURIComponent(mobile)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setApp(data))
      .catch(() => setApp(null))
      .finally(() => setLoading(false));
  }, [id, mobile, router]);

  const formatSlot = (date: string, slot: string) => {
    if (!date || !slot) return "-";
    const d = new Date(`${date}T00:00:00`);
    const dateDisplay = d.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const sessionLabel = slot === "morning" ? "Morning (10 AM - 1 PM)" : slot === "afternoon" ? "Afternoon (2 PM - 5 PM)" : slot;
    return `${dateDisplay}, ${sessionLabel}`;
  };

  if (loading) return <div style={{ padding: "2rem" }}>Loading...</div>;
  if (!app || app.error) return <div style={{ padding: "2rem" }}>Application not found.</div>;

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>
      <main style={{ minHeight: "100vh", background: "#f8f9fc", padding: "2rem 1rem" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 14, padding: "0.9rem 1.1rem", color: "#166534", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <CheckCircle2 size={16} /> Application Submitted Successfully
          </div>

          <div style={{ marginTop: "1rem", background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: "1.25rem", boxShadow: "0 8px 30px rgba(15,23,42,0.05)" }}>
            <div
              style={{
                background: "#eff6ff",
                border: "2px solid #3b82f6",
                borderRadius: 12,
                padding: "1rem 1.5rem",
                textAlign: "center",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "#1e40af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.25rem" }}>
                Registration Code
              </div>
              <div style={{ fontFamily: "monospace", fontSize: "1.5rem", fontWeight: 700, color: "#1e40af", letterSpacing: "0.05em" }}>
                {formatRegCode(app.registration_code)}
              </div>
              <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.25rem" }}>Save this code for future tracking.</div>
            </div>

            <Info label="Student Name" value={app.student_name} />
            <Info label="Grade" value={GRADE_LABELS[Number(app.grade)] || `Class ${app.grade}`} />
            <Info label="Parent Name" value={app.parent_name} />
            <Info label="Mobile" value={app.mobile_number} />
            <Info label="Preferred Test Slot" value={formatSlot(app.preferred_test_date, app.preferred_test_slot)} />
            <Info label="Payment" value={`PAID | Rs ${(app.payment_amount || 0) / 100} | Txn: ${app.payment_txn_id || "-"}`} />

            <p style={{ marginTop: "1rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "0.75rem", color: "#334155", fontSize: "0.9rem" }}>
              The school will contact you to confirm your exact test date.
            </p>

            <div className="no-print" style={{ display: "flex", gap: "0.8rem", marginTop: "1rem", flexWrap: "wrap" }}>
              <button onClick={() => window.print()} style={{ background: "#1a3a6b", color: "white", border: "none", borderRadius: 10, padding: "0.7rem 1rem", cursor: "pointer", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                <Printer size={14} /> Print this Page
              </button>
              <button onClick={() => router.push("/")} style={{ background: "transparent", border: "none", color: "#1a3a6b", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <ArrowLeft size={14} /> Back to Home
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", borderBottom: "1px solid #f1f5f9", padding: "0.55rem 0" }}>
      <span style={{ color: "#64748b", fontSize: "0.9rem", fontWeight: 600 }}>{label}</span>
      <span style={{ color: "#0f172a", fontSize: "0.92rem", fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}
