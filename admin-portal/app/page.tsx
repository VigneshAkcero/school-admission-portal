"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import {
  BookOpen,
  ClipboardList,
  CreditCard,
  GraduationCap,
  LibraryBig,
  Mail,
  MapPin,
  PencilLine,
  Phone,
  School,
  Star,
  Sunrise,
  Sunset,
  Trophy,
  Users,
} from "lucide-react";

type DaySlot = {
  date: string;
  weekday: string;
  day: number;
  month: string;
  fullLabel: string;
};

type FormState = {
  studentName: string;
  parentName: string;
  mobileNumber: string;
  grade: string;
};

export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [slots, setSlots] = useState<DaySlot[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<"morning" | "afternoon" | "">("");
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>({
    studentName: "",
    parentName: "",
    mobileNumber: "",
    grade: "",
  });

  const loadSlots = async () => {
    setSlotsLoading(true);
    setSlotsError("");
    try {
      const data = await apiRequest<{ slots: DaySlot[] }>("/api/parent/slots");
      setSlots(Array.isArray(data?.slots) ? data.slots : []);
    } catch (error) {
      console.error("Slots fetch error:", error);
      setSlotsError("Could not load available test slots. Please refresh.");
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    loadSlots().catch(() => undefined);
  }, []);

  const selectedDay = useMemo(() => slots.find((s) => s.date === selectedDate), [slots, selectedDate]);

  const validateForm = () => {
    const next: Record<string, string> = {};
    if (form.studentName.trim().length < 2) next.studentName = "Student name must be at least 2 characters.";
    if (form.parentName.trim().length < 2) next.parentName = "Parent name must be at least 2 characters.";
    if (!/^\d{10}$/.test(form.mobileNumber)) next.mobileNumber = "Mobile number must be exactly 10 digits.";
    if (!form.grade) next.grade = "Please select a grade.";
    if (!selectedDate) next.selectedDate = "Please select a test day.";
    if (!selectedSlot) next.selectedSlot = "Please select morning or afternoon.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    setSubmitError("");
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const preferredSlotValue = `${selectedDate}|${selectedSlot}`;
      const [preferredTestDate, preferredTestSlot] = preferredSlotValue.split("|");
      const data = await apiRequest<{
        applicationId: string;
        studentName: string;
        registrationCode: string;
        amount: number;
        amountDisplay: string;
      }>("/api/parent/register", {
        method: "POST",
        body: {
          studentName: form.studentName,
          parentName: form.parentName,
          mobileNumber: form.mobileNumber,
          grade: Number.parseInt(form.grade, 10),
          preferredTestDate,
          preferredTestSlot,
        },
      });

      sessionStorage.setItem(
        "paymentData",
        JSON.stringify({
          applicationId: data.applicationId,
          studentName: data.studentName,
          registrationCode: data.registrationCode,
          amount: data.amount,
          amountDisplay: data.amountDisplay,
          parentName: form.parentName,
          mobileNumber: form.mobileNumber,
          grade: form.grade,
          preferredTestDate,
          preferredTestSlot,
        }),
      );
      router.push("/payment");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }
        :root {
          --primary: #1a3a6b;
          --primary-light: #2a52a0;
          --accent: #f0a500;
          --accent-light: #fef3c7;
          --off-white: #f8f9fc;
          --text-dark: #0f172a;
          --text-mid: #334155;
          --text-muted: #64748b;
          --border: #e2e8f0;
        }
        .day-chip-scroll { display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem; scrollbar-width: none; }
        .day-chip-scroll::-webkit-scrollbar { display: none; }
        @media (max-width: 900px) {
          .hero-flex { flex-direction: column !important; }
          .hero-section { padding: 5rem 1.25rem 3rem !important; }
        }
        @media (max-width: 768px) {
          .navbar-inner { padding: 0.875rem 1.25rem !important; flex-direction: column; gap: 0.75rem; }
          .features-grid { grid-template-columns: 1fr 1fr !important; }
          .section-pad { padding: 4rem 1.25rem !important; }
          .footer-inner { padding: 3rem 1.25rem !important; }
        }
        @media (max-width: 520px) { .features-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)", boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,0.08)" : "none" }}>
        <div className="navbar-inner" style={{ maxWidth: 1200, margin: "0 auto", padding: "0.875rem 4rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--primary)", display: "grid", placeItems: "center", color: "white", fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.25rem" }}>M</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.05rem", color: "var(--primary)" }}>MONTESSORI PRIME SCHOOL</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", letterSpacing: "0.04em" }}>Moulding Global Citizens</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button onClick={() => document.getElementById("form-card")?.scrollIntoView({ behavior: "smooth", block: "start" })} style={{ background: "var(--accent)", color: "#000", fontWeight: 600, padding: "0.6rem 1.3rem", borderRadius: 8, border: "none", cursor: "pointer", fontSize: "0.875rem" }}>Apply for Admission</button>
            <button onClick={() => router.push("/login")} style={{ background: "transparent", color: "var(--primary)", fontWeight: 600, padding: "0.55rem 1.3rem", borderRadius: 8, border: "2px solid var(--primary)", cursor: "pointer", fontSize: "0.875rem" }}>Staff Login</button>
          </div>
        </div>
      </nav>

      <section className="hero-section" style={{ background: "linear-gradient(135deg, #1a3a6b 0%, #0f2347 65%, #162f5c 100%)", padding: "5rem 4rem 4rem", marginTop: 72, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -100, right: -100, width: 500, height: 500, background: "radial-gradient(circle, rgba(240,165,0,0.15) 0%, transparent 70%)", borderRadius: "50%" }} />

        <div className="hero-flex" style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "flex-start", gap: "3rem" }}>
          <div style={{ flex: "0 0 55%", color: "white" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(240,165,0,0.15)", border: "1px solid rgba(240,165,0,0.4)", borderRadius: 100, padding: "0.35rem 1rem", marginBottom: "1.25rem" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f0a500" }} />
              <span style={{ color: "#f0a500", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Admissions Open - 2026-27</span>
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2.4rem, 5vw, 3.75rem)", fontWeight: 800, lineHeight: 1.1, marginBottom: "1.25rem" }}>
              Shape Your Child&apos;s <br /><span style={{ color: "#f0a500" }}>Future</span> With Us
            </h1>
            <p style={{ fontSize: "1.05rem", color: "rgba(255,255,255,0.72)", maxWidth: 500, lineHeight: 1.75, marginBottom: "2rem" }}>
              A CBSE institution nurturing curious, confident and compassionate learners from Class I to IX. Located in Hyderabad, Telangana.
            </p>
            <button
              onClick={() => document.getElementById("why-us")?.scrollIntoView({ behavior: "smooth" })}
              style={{ background: "transparent", color: "white", fontWeight: 500, padding: "0.875rem 1.75rem", borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "1rem" }}
            >
              Learn More
            </button>
          </div>

          <div id="form-card" style={{ background: "white", borderRadius: 20, padding: "2rem", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", maxWidth: 440, width: "100%", flexShrink: 0 }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>Book Your Test Slot</h3>
            <p style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "1.25rem" }}>Takes less than 3 minutes</p>

            <Field label="Student Full Name *" value={form.studentName} onChange={(value) => setForm((prev) => ({ ...prev, studentName: value }))} error={errors.studentName} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.75rem" }}>
              <Field label="Parent/Guardian Name *" value={form.parentName} onChange={(value) => setForm((prev) => ({ ...prev, parentName: value }))} error={errors.parentName} />
              <Field label="Mobile Number (10 digits) *" value={form.mobileNumber} onChange={(value) => setForm((prev) => ({ ...prev, mobileNumber: value.replace(/\D/g, "").slice(0, 10) }))} error={errors.mobileNumber} />
            </div>

            <div style={{ marginTop: "0.75rem" }}>
              <label style={labelStyle}>Applying for Grade *</label>
              <select value={form.grade} onChange={(e) => setForm((prev) => ({ ...prev, grade: e.target.value }))} style={inputStyle}>
                <option value="">Select grade...</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => <option key={g} value={String(g)}>{`Class ${g}`}</option>)}
              </select>
              {errors.grade ? <ErrorText message={errors.grade} /> : null}
            </div>

            <div style={{ marginTop: "0.75rem" }}>
              <label style={labelStyle}>Preferred Test Slot *</label>
              <div className="day-chip-scroll">
                {slotsLoading ? (
                  <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Loading available days...</div>
                ) : (
                  slots.map((slot) => {
                    const active = selectedDate === slot.date;
                    return (
                      <button
                        key={slot.date}
                        onClick={() => {
                          setSelectedDate(slot.date);
                          setSelectedSlot("");
                        }}
                        style={{
                          minWidth: 52,
                          padding: "0.5rem 0.375rem",
                          borderRadius: 10,
                          border: `1.5px solid ${active ? "#1a3a6b" : "#e2e8f0"}`,
                          background: active ? "#1a3a6b" : "white",
                          color: active ? "white" : "#0f172a",
                          textAlign: "center",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        <div style={{ fontSize: "0.65rem", fontWeight: 700 }}>{slot.weekday}</div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 700, lineHeight: 1.1 }}>{slot.day}</div>
                        <div style={{ fontSize: "0.64rem" }}>{slot.month}</div>
                      </button>
                    );
                  })
                )}
              </div>
              {slotsError ? (
                <div style={{ marginTop: "0.4rem", color: "#ef4444", fontSize: "0.82rem" }}>
                  {slotsError}
                  <button
                    type="button"
                    onClick={() => loadSlots().catch(() => undefined)}
                    style={{
                      marginLeft: "0.65rem",
                      color: "#1a3a6b",
                      fontWeight: 700,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textDecoration: "underline",
                      fontSize: "0.82rem",
                    }}
                  >
                    Retry
                  </button>
                </div>
              ) : null}
              {errors.selectedDate ? <ErrorText message={errors.selectedDate} /> : null}

              {selectedDay ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginTop: "0.7rem" }}>
                  <SessionButton
                    active={selectedSlot === "morning"}
                    icon={<Sunrise size={14} />}
                    title="Morning"
                    subtitle="10 AM - 1 PM"
                    onClick={() => setSelectedSlot("morning")}
                  />
                  <SessionButton
                    active={selectedSlot === "afternoon"}
                    icon={<Sunset size={14} />}
                    title="Afternoon"
                    subtitle="2 PM - 5 PM"
                    onClick={() => setSelectedSlot("afternoon")}
                  />
                </div>
              ) : null}
              {errors.selectedSlot ? <ErrorText message={errors.selectedSlot} /> : null}
            </div>

            {submitError ? <ErrorText message={submitError} /> : null}
            <button onClick={handleSubmit} disabled={submitting || slotsLoading} style={{ marginTop: "0.9rem", width: "100%", background: submitting ? "#cbd5e1" : "#f0a500", color: "#000", fontWeight: 700, padding: "0.88rem 1rem", borderRadius: 10, border: "none", cursor: submitting ? "not-allowed" : "pointer", fontSize: "0.96rem" }}>
              {submitting ? "Processing..." : "Book Slot & Proceed to Payment ->"}
            </button>
          </div>
        </div>

        <div style={{ background: "rgba(0,0,0,0.25)", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "center", alignItems: "center", gap: "2rem", padding: "1.25rem 2rem", flexWrap: "wrap", color: "white", marginTop: "2.5rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><GraduationCap size={16} /> <strong>500+</strong> Alumni</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><BookOpen size={16} /> <strong>15+</strong> Years of Excellence</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><Trophy size={16} /> <strong>95%</strong> Board Results</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><Star size={16} /> <strong>CBSE</strong> Affiliated</div>
        </div>
      </section>

      <section className="section-pad" style={{ background: "white", padding: "5rem 4rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--accent)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Simple Process</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.8rem, 3vw, 2.5rem)", fontWeight: 700, color: "var(--text-dark)", marginBottom: "0.75rem" }}>How to Apply</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "1rem", maxWidth: 480, margin: "0 auto" }}>Three simple steps to secure your child&apos;s admission</p>
          </div>
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap" }}>
            {[
              { num: "1", title: "Register Online", desc: "Fill in your child's details and submit the application form.", icon: <ClipboardList size={22} /> },
              { num: "2", title: "Pay the Fee", desc: "Complete the Rs 500 registration fee through a secure payment page.", icon: <CreditCard size={22} /> },
              { num: "3", title: "Take the Test", desc: "Appear for the admission assessment at your selected slot.", icon: <PencilLine size={22} /> },
            ].map((step) => (
              <div key={step.num} style={{ flex: 1, minWidth: 240, background: "var(--off-white)", border: "1.5px solid var(--border)", borderRadius: 20, padding: "2rem 1.75rem" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--primary)", color: "white", display: "grid", placeItems: "center", fontFamily: "'Playfair Display', serif", fontWeight: 700, marginBottom: "1.25rem" }}>{step.num}</div>
                <div style={{ marginBottom: "0.75rem", color: "#1a3a6b" }}>{step.icon}</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.15rem", color: "var(--text-dark)", marginBottom: "0.6rem" }}>{step.title}</div>
                <p style={{ color: "var(--text-mid)", fontSize: "0.9rem", lineHeight: 1.65 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="why-us" className="section-pad" style={{ background: "var(--off-white)", padding: "5rem 4rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--accent)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Our Difference</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.8rem, 3vw, 2.5rem)", fontWeight: 700, color: "var(--text-dark)" }}>Why Montessori Prime?</h2>
          </div>
          <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.25rem" }}>
            {[
              { icon: <LibraryBig size={20} />, title: "CBSE Curriculum", desc: "Structured learning aligned to national standards with a focus on conceptual understanding." },
              { icon: <School size={20} />, title: "Modern Facilities", desc: "Smart classrooms, science labs, library, and dedicated play areas." },
              { icon: <Star size={20} />, title: "Holistic Development", desc: "Arts, sports, and cultural activities integrated with academics." },
              { icon: <Users size={20} />, title: "Small Batches", desc: "Low student-to-teacher ratio for personalized attention." },
            ].map((f, idx) => (
              <div key={`${f.title}-${idx}`} style={{ background: "white", borderRadius: 20, padding: "2rem 1.75rem", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", border: "1px solid var(--border)" }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--accent-light)", display: "grid", placeItems: "center", marginBottom: "1.25rem", color: "#1a3a6b" }}>{f.icon}</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.05rem", color: "var(--primary)", marginBottom: "0.6rem" }}>{f.title}</div>
                <p style={{ color: "var(--text-mid)", fontSize: "0.875rem", lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad" style={{ background: "var(--primary)", padding: "5rem 4rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "rgba(240,165,0,0.8)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Enroll Now</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.8rem, 3vw, 2.5rem)", fontWeight: 700, color: "white", marginBottom: "0.75rem" }}>Classes Offered</h2>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "1rem", marginBottom: "2.5rem" }}>Admissions open for Class I through Class IX</p>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "2.5rem" }}>
            {["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"].map((g) => (
              <div key={g} style={{ background: "rgba(255,255,255,0.12)", color: "white", fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.05rem", padding: "0.6rem 1.25rem", borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.2)" }}>{g}</div>
            ))}
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem", letterSpacing: "0.05em" }}>Curriculum: CBSE - Medium: English - Co-educational</div>
        </div>
      </section>

      <section className="section-pad" style={{ background: "#fffbeb", padding: "5rem 4rem" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--accent)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Don&apos;t Miss Out</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.8rem, 3vw, 2.5rem)", fontWeight: 700, color: "var(--text-dark)" }}>Important Dates - 2026-27</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[
              { label: "Registration Opens", date: "1 March 2026" },
              { label: "Last Date to Apply", date: "31 March 2026" },
              { label: "Admission Test Days", date: "Every Saturday & Sunday" },
              { label: "Results Announced", date: "Within 7 days of test" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", background: "white", borderRadius: 14, padding: "1.25rem 1.75rem", border: "1px solid #fde68a", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                  <CalendarDot />
                  <span style={{ fontWeight: 600, color: "var(--text-dark)", fontSize: "0.95rem" }}>{item.label}</span>
                </div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "var(--primary)", fontSize: "0.95rem" }}>{item.date}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer style={{ background: "#0f2347" }}>
        <div className="footer-inner" style={{ maxWidth: 1200, margin: "0 auto", padding: "4rem 4rem 2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "2rem", paddingBottom: "2rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.875rem" }}>
                <div style={{ width: 40, height: 40, borderRadius: 9, background: "var(--accent)", display: "grid", placeItems: "center", color: "#000", fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.1rem" }}>M</div>
                <div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "0.95rem", color: "white" }}>MONTESSORI PRIME SCHOOL</div>
                  <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)" }}>Moulding Global Citizens</div>
                </div>
              </div>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.825rem", lineHeight: 1.7, maxWidth: 280 }}>Classes I - IX - CBSE Curriculum<br />English Medium - Co-educational</p>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>Contact Us</div>
              <div style={footerLine}><MapPin size={14} /> <span>[School Address], Hyderabad, Telangana</span></div>
              <div style={footerLine}><Phone size={14} /> <span>[Phone Number]</span></div>
              <div style={footerLine}><Mail size={14} /> <span>[Email Address]</span></div>
            </div>
          </div>
          <div style={{ paddingTop: "1.5rem", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "0.8rem" }}>(c) 2026 Montessori Prime School. All rights reserved.</div>
        </div>
      </footer>
    </>
  );
}

function Field({ label, value, onChange, error }: { label: string; value: string; onChange: (value: string) => void; error?: string }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
      {error ? <ErrorText message={error} /> : null}
    </div>
  );
}

function SessionButton({
  active,
  icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: active ? "none" : "1.5px solid #e2e8f0",
        background: active ? "#f0a500" : "white",
        color: active ? "#111827" : "#334155",
        borderRadius: 10,
        padding: "0.75rem 0.55rem",
        cursor: "pointer",
        textAlign: "center",
      }}
    >
      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontWeight: 700, fontSize: "0.85rem" }}>{icon} {title}</div>
      <div style={{ marginTop: "0.2rem", fontSize: "0.74rem" }}>{subtitle}</div>
    </button>
  );
}

function ErrorText({ message }: { message: string }) {
  return <p style={{ marginTop: "0.3rem", color: "#ef4444", fontSize: "0.76rem" }}>{message}</p>;
}

function CalendarDot() {
  return <span style={{ width: 10, height: 10, borderRadius: 999, background: "#f0a500", display: "inline-block" }} />;
}

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: "0.35rem",
  fontSize: "0.82rem",
  color: "#334155",
  fontWeight: 600,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "0.66rem 0.75rem",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  fontSize: "0.9rem",
};

const footerLine: CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  alignItems: "center",
  marginBottom: "0.5rem",
  color: "rgba(255,255,255,0.55)",
  fontSize: "0.85rem",
};
