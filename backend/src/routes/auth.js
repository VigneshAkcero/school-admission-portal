const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const rateLimit = require("express-rate-limit");
const pool = require("../db/pool");
const config = require("../config");
const { normalizeTestCode } = require("../utils/codeGenerator");
const { verifyCodeSchema } = require("../utils/validators");

const router = express.Router();

router.post("/login", async (req, res) => {
  const schema = z.object({
    username: z.string().trim().min(1).optional(),
    email: z.string().trim().min(1).optional(),
    password: z.string().min(1),
  }).refine((data) => data.username || data.email, {
    message: "Username is required",
    path: ["username"],
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const identifier = (parsed.data.username || parsed.data.email || "").trim().toLowerCase();
  const { password } = parsed.data;

  const userResult = await pool.query(
    `SELECT id, email, password_hash, role, name FROM users WHERE email = $1`,
    [identifier],
  );

  if (userResult.rowCount === 0) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const user = userResult.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );

  return res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});

const verifyCodeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many code verification attempts. Try again in a minute." },
});

router.post("/verify-code", verifyCodeLimiter, async (req, res) => {
  const parsed = verifyCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const normalized = normalizeTestCode(parsed.data.testCode);
  if (!/^MPS\d{9}$/.test(normalized)) {
    return res.status(400).json({ error: "Invalid test code format." });
  }

  const sessionResult = await pool.query(
    `SELECT a.id,
            a.student_name,
            a.grade,
            a.status,
            COALESCE(question_totals.total_questions, 0) AS total_questions
     FROM applicants a
     LEFT JOIN (
       SELECT class_level, COUNT(*)::int AS total_questions
       FROM questions
       GROUP BY class_level
     ) question_totals ON question_totals.class_level = a.grade
     WHERE a.test_code = $1`,
    [normalized],
  );

  if (sessionResult.rowCount === 0) {
    return res.status(404).json({ valid: false });
  }

  const session = sessionResult.rows[0];

  if (session.status !== "test_scheduled") {
    return res.status(404).json({ valid: false });
  }

  return res.json({
    valid: true,
    studentName: session.student_name,
    grade: session.grade,
    totalQuestions: session.total_questions,
    maximumMarks: session.total_questions,
  });
});

module.exports = router;
