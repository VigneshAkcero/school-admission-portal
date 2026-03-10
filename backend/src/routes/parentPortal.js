const express = require("express");
const pool = require("../db/pool");
const { generateRegCode } = require("../utils/regCodeGenerator");
const { broadcastToAdmins, broadcastToAdminMonitor } = require("../websocket/hub");

const router = express.Router();

router.get("/fee", async (_req, res) => {
  const result = await pool.query(`SELECT value FROM settings WHERE key = 'registration_fee_paise'`);
  const paise = Number.parseInt(result.rows[0]?.value ?? "50000", 10);
  return res.json({
    amount_paise: paise,
    amount_rupees: paise / 100,
    amount_display: `Rs ${paise / 100}`,
  });
});

router.get("/slots", async (_req, res) => {
  try {
    const slots = [];
    const today = new Date();

    for (let i = 1; i <= 14; i += 1) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const date = d.toISOString().split("T")[0];
      slots.push({
        date,
        weekday: d.toLocaleDateString("en-IN", { weekday: "short" }),
        day: d.getDate(),
        month: d.toLocaleDateString("en-IN", { month: "short" }),
        fullLabel: d.toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      });
    }

    return res.json({ slots });
  } catch (error) {
    console.error("Slots error:", error);
    return res.status(500).json({ error: "Failed to load slots" });
  }
});

router.post("/register", async (req, res) => {
  const {
    studentName,
    parentName,
    mobileNumber,
    grade,
    preferredTestDate,
    preferredTestSlot,
  } = req.body || {};

  if (!studentName || !parentName || !mobileNumber || !grade || !preferredTestDate || !preferredTestSlot) {
    return res.status(400).json({ error: "All required fields must be filled." });
  }
  if (!/^\d{10}$/.test(String(mobileNumber))) {
    return res.status(400).json({ error: "Mobile number must be 10 digits." });
  }
  const gradeNum = Number(grade);
  if (!Number.isInteger(gradeNum) || gradeNum < 1 || gradeNum > 9) {
    return res.status(400).json({ error: "Grade must be between 1 and 9." });
  }
  if (!["morning", "afternoon"].includes(String(preferredTestSlot))) {
    return res.status(400).json({ error: "Invalid slot. Must be morning or afternoon." });
  }

  const feeResult = await pool.query(`SELECT value FROM settings WHERE key = 'registration_fee_paise'`);
  const amountPaise = Number.parseInt(feeResult.rows[0]?.value ?? "50000", 10);
  const registrationCode = await generateRegCode(gradeNum);

  const result = await pool.query(
    `INSERT INTO applicants
      (student_name, parent_name, mobile_number, grade,
       preferred_test_date, preferred_test_slot,
       status, source, payment_status, payment_amount, registration_code)
     VALUES ($1,$2,$3,$4,$5,$6,
             'payment_pending','parent_portal','pending',$7,$8)
     RETURNING id, student_name, registration_code`,
    [
      String(studentName).trim(),
      String(parentName).trim(),
      String(mobileNumber).trim(),
      gradeNum,
      preferredTestDate,
      preferredTestSlot,
      amountPaise,
      registrationCode,
    ],
  );

  const app = result.rows[0];
  return res.json({
    applicationId: app.id,
    studentName: app.student_name,
    registrationCode: app.registration_code,
    amount: amountPaise,
    amountDisplay: `Rs ${amountPaise / 100}`,
    preferredTestDate,
    preferredTestSlot,
  });
});

router.post("/confirm-payment", async (req, res) => {
  const { applicationId } = req.body || {};
  if (!applicationId) {
    return res.status(400).json({ error: "applicationId is required." });
  }

  const fakeTxnId = `DUMMY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const result = await pool.query(
    `UPDATE applicants
     SET status = 'paid',
         payment_status = 'paid',
         payment_txn_id = $1,
         payment_at = NOW()
     WHERE id = $2
       AND status = 'payment_pending'
     RETURNING
       id, student_name, parent_name, mobile_number, grade,
       registration_code, preferred_test_date, preferred_test_slot,
       payment_amount, payment_txn_id, payment_at`,
    [fakeTxnId, applicationId],
  );

  if (!result.rows[0]) {
    return res.status(404).json({ error: "Application not found or already processed." });
  }

  const app = result.rows[0];
  const payload = {
    type: "NEW_PARENT_APPLICATION",
    applicationId: app.id,
    studentName: app.student_name,
    grade: app.grade,
    registrationCode: app.registration_code,
    amount: (app.payment_amount || 0) / 100,
  };
  try {
    broadcastToAdmins("NEW_PARENT_APPLICATION", payload);
    broadcastToAdminMonitor("NEW_PARENT_APPLICATION", payload);
  } catch (e) {
    console.warn("WS broadcast failed:", e.message);
  }

  return res.json({
    success: true,
    applicationId: app.id,
    studentName: app.student_name,
    parentName: app.parent_name,
    mobileNumber: app.mobile_number,
    grade: app.grade,
    registrationCode: app.registration_code,
    preferredTestDate: app.preferred_test_date,
    preferredTestSlot: app.preferred_test_slot,
    amountPaid: (app.payment_amount || 0) / 100,
    txnId: app.payment_txn_id,
    paidAt: app.payment_at,
  });
});

router.get("/application/:id", async (req, res) => {
  const { mobile } = req.query;
  if (!mobile) {
    return res.status(400).json({ error: "Mobile number required." });
  }

  const result = await pool.query(
    `SELECT
       id, student_name, parent_name, mobile_number, grade,
       email, date_of_birth, preferred_test_date, preferred_test_slot,
       registration_code, status, source, payment_status,
       payment_amount, payment_txn_id, payment_at, applied_at AS created_at
     FROM applicants
     WHERE id = $1 AND mobile_number = $2`,
    [req.params.id, String(mobile)],
  );

  if (!result.rows[0]) {
    return res.status(404).json({ error: "Application not found." });
  }
  return res.json(result.rows[0]);
});

module.exports = router;
