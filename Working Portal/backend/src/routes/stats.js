const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");

const router = express.Router();

const registrationsByGradeQuerySchema = z.object({
  period: z.enum(["today", "week", "month", "year"]).default("today"),
});

router.get("/registrations-by-grade", async (req, res) => {
  const parsed = registrationsByGradeQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query" });
  }

  const whereClauseByPeriod = {
    today: "applied_at::date = CURRENT_DATE",
    week: "applied_at >= DATE_TRUNC('week', CURRENT_DATE)",
    month: "applied_at >= DATE_TRUNC('month', CURRENT_DATE)",
    year: "applied_at >= DATE_TRUNC('year', CURRENT_DATE)",
  };

  const result = await pool.query(
    `SELECT
       grades.grade::int AS grade,
       COALESCE(counts.total, 0)::int AS registrations
     FROM generate_series(1, 9) AS grades(grade)
     LEFT JOIN (
       SELECT
         grade,
         COUNT(*)::int AS total
       FROM applicants
       WHERE status != 'revoked'
         AND ${whereClauseByPeriod[parsed.data.period]}
       GROUP BY grade
     ) counts ON counts.grade = grades.grade
     ORDER BY grades.grade ASC`,
  );

  return res.json({
    period: parsed.data.period,
    grades: result.rows,
  });
});

module.exports = router;
