const express = require("express");
const pool = require("../db/pool");
const { createApplicantSchema } = require("../utils/validators");
const { generateRegCode } = require("../utils/regCodeGenerator");

const router = express.Router();

router.post("/", async (req, res) => {
  const parsed = createApplicantSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const { studentName, parentName, mobile, grade } = parsed.data;
  const registrationCode = await generateRegCode(grade);

  const result = await pool.query(
    `INSERT INTO applicants
       (student_name, parent_name, mobile_number, grade,
        status, source, created_by, registration_code, payment_status)
     VALUES ($1, $2, $3, $4, 'pending', 'receptionist', $5, $6, 'not_required')
     RETURNING *`,
    [studentName, parentName, mobile, grade, req.user.sub, registrationCode],
  );

  return res.status(201).json({ application: result.rows[0] });
});

router.get("/", async (_req, res) => {
  const result = await pool.query(
    `SELECT
       a.id,
       a.student_name,
       a.parent_name,
       a.mobile_number,
       a.grade,
       a.status,
       a.source,
       a.registration_code,
       a.payment_status,
       a.payment_amount,
       a.payment_txn_id,
       a.payment_at,
       a.preferred_test_date,
       a.preferred_test_slot,
       a.email,
       a.applied_at AS created_at,
       a.applied_at AS application_date,
       t.test_code
     FROM applicants a
     LEFT JOIN test_sessions t ON t.applicant_id = a.id
     ORDER BY a.applied_at DESC`,
  );

  return res.json({ applications: result.rows });
});

module.exports = router;
