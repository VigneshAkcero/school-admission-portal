const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { createApplicantSchema } = require("../utils/validators");
const { generateRegCode } = require("../utils/regCodeGenerator");

const router = express.Router();

router.get("/dashboard", async (_req, res) => {
  const [countResult, listResult] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
         COUNT(*) FILTER (WHERE status = 'test_scheduled')::int AS scheduled_count,
         COUNT(*) FILTER (WHERE applied_at::date = CURRENT_DATE)::int AS today_count,
         COUNT(*) FILTER (WHERE applied_at >= DATE_TRUNC('week', CURRENT_DATE))::int AS week_count,
         COUNT(*) FILTER (WHERE applied_at >= DATE_TRUNC('month', CURRENT_DATE))::int AS month_count,
         COUNT(*) FILTER (WHERE applied_at >= DATE_TRUNC('year', CURRENT_DATE))::int AS year_count
       FROM applicants
       WHERE status != 'revoked'`,
    ),
    pool.query(
      `SELECT
         id,
         registration_code,
         student_name,
         parent_name,
         mobile_number,
         grade,
         status,
         source,
         payment_status,
         payment_amount,
         payment_txn_id,
         payment_at,
         test_code,
         applied_at
       FROM applicants
       WHERE status != 'revoked'
       ORDER BY applied_at DESC
       LIMIT 5`,
    ),
  ]);

  return res.json({
    summary: countResult.rows[0],
    applicants: listResult.rows,
  });
});

router.get("/applicants", async (req, res) => {
  const schema = z.object({
    search: z.string().trim().optional(),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query" });
  }

  const values = [];
  const where = ["status != 'revoked'"];
  if (parsed.data.search) {
    values.push(`%${parsed.data.search}%`);
    where.push(`(student_name ILIKE $${values.length} OR parent_name ILIKE $${values.length} OR mobile_number ILIKE $${values.length})`);
  }

  const result = await pool.query(
      `SELECT
         id,
         registration_code,
         student_name,
         parent_name,
         mobile_number,
         grade,
         status,
         source,
         payment_status,
         payment_amount,
         payment_txn_id,
         payment_at,
         test_code,
         applied_at
       FROM applicants
     WHERE ${where.join(" AND ")}
     ORDER BY applied_at DESC`,
    values,
  );

  return res.json({ applicants: result.rows });
});

router.post("/applicants", async (req, res) => {
  const parsed = createApplicantSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const { studentName, parentName, mobile, grade } = parsed.data;
  const registrationCode = await generateRegCode(grade);

  const result = await pool.query(
    `INSERT INTO applicants (
       student_name,
       parent_name,
       mobile_number,
       grade,
       test_code,
       status,
       source,
       payment_status,
       registration_code,
       created_by
     )
     VALUES ($1, $2, $3, $4, $5, 'pending', 'receptionist', 'not_required', $6, $7)
     RETURNING id, registration_code, student_name, parent_name, mobile_number, grade, test_code, status, source, payment_status, applied_at`,
    [studentName, parentName, mobile, grade, null, registrationCode, req.user.sub],
  );

  return res.status(201).json({ applicant: result.rows[0] });
});

module.exports = router;
