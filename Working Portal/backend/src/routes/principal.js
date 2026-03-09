const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");

const router = express.Router();

router.get("/dashboard-summary", async (_req, res) => {
  const result = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status != 'revoked')::int AS total_applications,
       COUNT(*) FILTER (WHERE status = 'approved')::int AS accepted_count,
       COUNT(*) FILTER (WHERE status = 'test_completed')::int AS pending_reviews
     FROM applicants`,
  );

  return res.json(result.rows[0]);
});

router.get("/trends", async (req, res) => {
  const schema = z.object({
    range: z.enum(["daily", "weekly", "monthly", "yearly"]).default("monthly"),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query" });
  }

  const period =
    parsed.data.range === "daily"
      ? "day"
      : parsed.data.range === "weekly"
        ? "week"
        : parsed.data.range === "yearly"
          ? "year"
          : "month";

  const bucketSql =
    parsed.data.range === "daily"
      ? "TO_CHAR(DATE_TRUNC('day', decision_at), 'DD Mon')"
      : parsed.data.range === "weekly"
        ? "TO_CHAR(DATE_TRUNC('week', decision_at), 'DD Mon')"
        : parsed.data.range === "yearly"
          ? "TO_CHAR(DATE_TRUNC('year', decision_at), 'YYYY')"
          : "TO_CHAR(DATE_TRUNC('month', decision_at), 'Mon YYYY')";

  const result = await pool.query(
    `SELECT
       ${bucketSql} AS label,
       COUNT(*)::int AS accepted_count
     FROM applicants
     WHERE status = 'approved' AND decision_at IS NOT NULL
     GROUP BY 1
     ORDER BY MIN(DATE_TRUNC('${period}', decision_at)) ASC`,
  );

  return res.json({ points: result.rows });
});

router.get("/results", async (req, res) => {
  const schema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    grade: z.string().regex(/^[1-9]$/).optional(),
    search: z.string().optional(),
    status: z.enum(["all", "test_completed", "approved", "rejected"]).optional(),
  });

  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query" });
  }

  const { date, grade, search, status } = parsed.data;
  const where = ["a.status IN ('test_completed', 'approved', 'rejected')"];
  const values = [];

  if (date) {
    values.push(date);
    where.push(`a.applied_at::date = $${values.length}`);
  }

  if (grade) {
    values.push(Number(grade));
    where.push(`a.grade = $${values.length}`);
  }

  if (search) {
    values.push(`%${search.trim()}%`);
    where.push(`a.student_name ILIKE $${values.length}`);
  }

  if (status && status !== "all") {
    values.push(status);
    where.push(`a.status = $${values.length}`);
  }

  const result = await pool.query(
    `SELECT
       a.id,
       a.student_name,
       a.parent_name,
       a.mobile_number,
       a.grade,
       a.status,
       a.test_code,
       a.applied_at,
       a.test_completed_at,
       a.score,
       a.score_english,
       a.score_math,
       a.score_science_evs,
       a.score_telugu,
       a.score_hindi,
       COALESCE(question_totals.total_questions, 0)::int AS total_questions,
       CASE
         WHEN COALESCE(question_totals.total_questions, 0) = 0 THEN 0
         ELSE ROUND((COALESCE(a.score, 0)::numeric / question_totals.total_questions::numeric) * 100, 1)
       END AS score_percentage,
       a.total_tab_switches,
       a.decision_at,
       ts.start_time,
       ts.end_time,
       TO_CHAR(a.applied_at, 'DD/MM/YYYY') AS applied_date_ist,
       TO_CHAR(ts.start_time, 'HH12:MI:SS AM') AS start_time_ist,
       TO_CHAR(ts.end_time, 'HH12:MI:SS AM') AS end_time_ist
     FROM applicants a
     LEFT JOIN test_sessions ts ON ts.applicant_id = a.id
     LEFT JOIN (
       SELECT class_level, COUNT(*)::int AS total_questions
       FROM questions
       GROUP BY class_level
     ) question_totals ON question_totals.class_level = a.grade
     WHERE ${where.join(" AND ")}
     ORDER BY COALESCE(a.test_completed_at, ts.end_time, a.applied_at) DESC, a.applied_at DESC`,
    values,
  );

  return res.json({ results: result.rows });
});

router.post("/results/:id/decision", async (req, res) => {
  const schema = z.object({
    id: z.string().uuid(),
    decision: z.enum(["approved", "rejected"]),
  });
  const parsed = schema.safeParse({
    id: req.params.id,
    decision: req.body?.decision,
  });
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const result = await pool.query(
    `UPDATE applicants
     SET status = $2,
         decision_by = $3,
         decision_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
       AND status IN ('test_completed', 'approved', 'rejected')
     RETURNING id, status`,
    [parsed.data.id, parsed.data.decision, req.user.sub],
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Applicant result not found" });
  }

  return res.json({ success: true, status: result.rows[0].status });
});

router.get("/export-csv", async (req, res) => {
  const result = await pool.query(
    `SELECT
       a.student_name,
       a.parent_name,
       a.grade,
       a.mobile_number,
       a.status,
       CASE
         WHEN COALESCE(question_totals.total_questions, 0) = 0 THEN 0
         ELSE ROUND((COALESCE(a.score, 0)::numeric / question_totals.total_questions::numeric) * 100, 1)
       END AS score_percentage,
       TO_CHAR(a.applied_at, 'YYYY-MM-DD') AS date_applied,
       a.total_tab_switches
     FROM applicants a
     LEFT JOIN (
       SELECT class_level, COUNT(*)::int AS total_questions
       FROM questions
       GROUP BY class_level
     ) question_totals ON question_totals.class_level = a.grade
     WHERE a.status = 'approved'
     ORDER BY a.decision_at DESC`,
  );

  const rows = result.rows;
  const headers = "Student Name,Parent Name,Grade,Mobile Number,Status,Score Percentage,Date Applied,Tab Switches";
  const csvContent = [
    headers,
    ...rows.map((r) =>
      [
        `"${r.student_name}"`,
        `"${r.parent_name}"`,
        r.grade,
        `"${r.mobile_number}"`,
        r.status,
        r.score_percentage || 0,
        r.date_applied,
        r.total_tab_switches,
      ].join(","),
    ),
  ].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=approved_students.csv");
  return res.send(csvContent);
});

module.exports = router;
