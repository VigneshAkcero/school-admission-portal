"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, CreditCard, QrCode, University } from "lucide-react";
import { GRADE_LABELS, formatRegCode } from "@/lib/codeUtils";
import { apiRequest } from "@/lib/api";

export default function PaymentPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("paymentData");
    if (!raw) {
      router.replace("/");
      return;
    }
    try {
      setData(JSON.parse(raw));
    } catch {
      router.replace("/");
    }
  }, [router]);

  const formatSlot = (date: string, session: string) => {
    if (!date || !session) return "-";
    const d = new Date(`${date}T00:00:00`);
    const dateDisplay = d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const sessionLabel = session === "morning" ? "Morning (10 AM - 1 PM)" : session === "afternoon" ? "Afternoon (2 PM - 5 PM)" : session;
    return `${dateDisplay} - ${sessionLabel}`;
  };

  const handleConfirm = async () => {
    if (!data?.applicationId) return;
    setConfirming(true);
    setError("");
    try {
      await apiRequest("/api/parent/confirm-payment", {
        method: "POST",
        body: { applicationId: data.applicationId },
      });

      sessionStorage.removeItem("paymentData");
      router.push(`/confirmation?id=${data.applicationId}&mobile=${encodeURIComponent(data.mobileNumber)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setConfirming(false);
    }
  };

  if (!data) return null;

  const amountRupees = Number(data.amount || 0) / 100;
  const upiId = "school@upi";
  const upiLink = `upi://pay?pa=${upiId}&pn=Montessori+Prime+School&am=${amountRupees}&cu=INR&tn=Admission+Fee`;

  return (
    <main style={{ minHeight: "100vh", background: "#f8f9fc", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "1.5rem" }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "#1a3a6b", color: "white", display: "grid", placeItems: "center", fontFamily: "serif", fontWeight: 700 }}>
            M
          </div>
          <div>
            <div style={{ fontWeight: 800, color: "#1a3a6b", fontFamily: "serif" }}>MONTESSORI PRIME SCHOOL</div>
            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>Moulding Global Citizens</div>
          </div>
        </div>

        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 18, boxShadow: "0 8px 30px rgba(15,23,42,0.06)", padding: "1.25rem" }}>
          <h1 style={{ margin: 0, color: "#0f172a", fontSize: "1.45rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <CreditCard size={20} />
            Complete Payment
          </h1>
          <p style={{ color: "#64748b", marginTop: "0.35rem" }}>Dummy confirmation flow for online admission registration.</p>

          <div style={{ marginTop: "1rem", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
            <h2 style={{ fontSize: "1rem", margin: "0 0 0.8rem", color: "#0f172a" }}>Order Summary</h2>
            <Row label="Student" value={data.studentName} />
            <Row label="Grade" value={GRADE_LABELS[Number(data.grade)] || `Class ${data.grade}`} />
            <Row label="Test Slot" value={formatSlot(data.preferredTestDate, data.preferredTestSlot)} />
            <Row label="Reg Code" value={formatRegCode(data.registrationCode)} mono />
          </div>

          <div style={{ marginTop: "1rem", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
            <Row label="Registration Fee" value={data.amountDisplay || `Rs ${amountRupees}`} />
            <Row label="Processing Fee" value="Rs 0" />
            <div style={{ borderTop: "1px solid #e2e8f0", marginTop: "0.6rem", paddingTop: "0.6rem" }}>
              <Row label="Total" value={data.amountDisplay || `Rs ${amountRupees}`} strong />
            </div>
          </div>

          <div style={{ marginTop: "1rem", background: "#f8f9fc", border: "1.5px solid #e2e8f0", borderRadius: 16, padding: "1.5rem", textAlign: "center", marginBottom: "1rem" }}>
            <div style={{ fontWeight: 700, color: "#0f172a", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <QrCode size={18} />
              Pay via UPI
            </div>
            <div style={{ marginTop: "0.8rem" }}>
              <QRCodeSVG value={upiLink} size={180} level="M" includeMargin style={{ display: "block", margin: "0 auto" }} />
            </div>
            <div style={{ marginTop: "0.9rem", fontSize: "0.86rem", color: "#475569", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <University size={14} /> UPI ID: {upiId}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.3rem" }}>
              Scan with any UPI app (PhonePe / GPay / Paytm / BHIM)
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#94a3b8", fontSize: "0.8rem", margin: "1rem 0" }}>
              <span style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
              OR
              <span style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
            </div>

            <button
              onClick={handleConfirm}
              disabled={confirming}
              style={{
                background: confirming ? "#cbd5e1" : "#f0a500",
                color: "#000",
                fontWeight: 700,
                border: "none",
                borderRadius: 10,
                padding: "0.8rem 1.15rem",
                cursor: confirming ? "not-allowed" : "pointer",
              }}
            >
              {confirming ? "Processing..." : `verify Payment`}
            </button>
            <p style={{ fontSize: "0.75rem", color: "#94a3b8", textAlign: "center", marginTop: "0.5rem" }}>
              This is a demo environment - click Confirm to simulate payment
            </p>
          </div>

          {error ? <p style={{ color: "#ef4444", marginTop: "0.9rem", fontSize: "0.9rem" }}>{error}</p> : null}

          <div style={{ display: "flex", gap: "0.8rem", marginTop: "1rem", flexWrap: "wrap" }}>
            <button onClick={() => router.back()} style={{ background: "transparent", border: "none", color: "#1a3a6b", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <ArrowLeft size={14} />
              Go Back
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
  mono,
  strong,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: "0.34rem 0" }}>
      <span style={{ color: "#475569", fontWeight: strong ? 700 : 500 }}>{label}</span>
      <span style={{ color: "#0f172a", fontWeight: strong ? 800 : 600, fontFamily: mono ? "monospace" : "inherit" }}>{value}</span>
    </div>
  );
}
