const express = require("express");
const { z } = require("zod");
const pool = require("../db/pool");
const { createApplicantSchema } = require("../utils/validators");
const { generateTestCode, formatTestCodeForDisplay, normalizeTestCode } = require("../utils/codeGenerator");
const { generateRegCode } = require("../utils/regCodeGenerator");
const { calculateScores } = require("../utils/scoring");
const { broadcastToAdmins, broadcastToAdminMonitor } = require("../websocket/hub");

const router = express.Router();

const listSchema = z.object({
  status: z
    .enum(["all", "pending", "test_scheduled", "test_started", "test_completed"])
    .optional(),
  search: z.string().trim().optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

function buildApplicantSelect(whereSql = "a.status != 'revoked'", values = []) {
  return pool.query(
    `SELECT
       a.id,
       a.applicant_number,
       a.registration_code,
       a.student_name,
       a.parent_name,
       a.mobile_number,
       a.grade,
       a.source,
       a.email,
       a.preferred_test_date,
       a.preferred_test_slot,
       a.payment_status,
       a.payment_amount,
       a.payment_txn_id,
       a.payment_at,
       CASE
         WHEN a.status IN ('approved', 'rejected') THEN 'test_completed'
         ELSE a.status
       END AS status,
       a.test_code,
       a.applied_at,
       a.updated_at,
       a.test_started_at,
       a.test_completed_at,
       a.total_tab_switches,
       a.score,
       a.score_english,
       a.score_math,
       a.score_science_evs,
       a.score_telugu,
       a.score_hindi,
       ts.start_time,
       ts.end_time,
       COALESCE(ts.status, 'created') AS session_status
     FROM applicants a
     LEFT JOIN test_sessions ts ON ts.applicant_id = a.id
     WHERE ${whereSql}
     ORDER BY a.applied_at DESC, a.updated_at DESC`,
    values,
  );
}

router.get("/dashboard-summary", async (_req, res) => {
  const [countResult, latestResult] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('test_completed', 'approved', 'rejected'))::int AS completed_overall,
         COUNT(*) FILTER (WHERE status = 'test_started')::int AS active_participants,
         COUNT(*) FILTER (WHERE status IN ('pending', 'payment_pending', 'paid'))::int AS pending_applicants,
         COUNT(*) FILTER (WHERE status = 'test_scheduled')::int AS scheduled_tests,
         COUNT(*) FILTER (WHERE status = 'test_completed')::int AS completed_pending_review
       FROM applicants
       WHERE status != 'revoked'`,
    ),
    pool.query(
      `SELECT
         a.id,
         a.student_name,
         a.grade,
         a.test_code,
         CASE
           WHEN a.status IN ('approved', 'rejected') THEN 'test_completed'
           ELSE a.status
         END AS status,
         ts.created_at AS updated_at
       FROM applicants a
       INNER JOIN test_sessions ts ON ts.applicant_id = a.id
       WHERE a.test_code IS NOT NULL
         AND a.status IN ('test_scheduled', 'test_started', 'test_completed', 'approved', 'rejected')
       ORDER BY ts.created_at DESC
       LIMIT 5`,
    ),
  ]);

  return res.json({
    completedOverall: countResult.rows[0].completed_overall,
    activeParticipants: countResult.rows[0].active_participants,
    pendingApplicants: countResult.rows[0].pending_applicants,
    scheduledTests: countResult.rows[0].scheduled_tests,
    completedPendingReview: countResult.rows[0].completed_pending_review,
    latestStudents: latestResult.rows,
  });
});

router.get("/applicants", async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query" });
  }

  const where = ["a.status != 'revoked'"];
  const values = [];

  if (parsed.data.status && parsed.data.status !== "all") {
    values.push(parsed.data.status);
    where.push(`a.status = $${values.length}`);
  }

  if (parsed.data.search) {
    values.push(`%${parsed.data.search}%`);
    where.push(`(a.student_name ILIKE $${values.length} OR a.parent_name ILIKE $${values.length} OR a.mobile_number ILIKE $${values.length} OR COALESCE(a.test_code, '') ILIKE $${values.length} OR COALESCE(a.registration_code, '') ILIKE $${values.length})`);
  }

  const result = await buildApplicantSelect(where.join(" AND "), values);
  return res.json({ applicants: result.rows });
});

router.get("/applications", async (_req, res) => {
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
       status,
       source,
       payment_status,
       registration_code,
       created_by
     )
     VALUES ($1, $2, $3, $4, 'pending', 'receptionist', 'not_required', $5, $6)
     RETURNING id, registration_code, student_name, parent_name, mobile_number, grade, status, source, payment_status, applied_at`,
    [studentName, parentName, mobile, grade, registrationCode, req.user.sub],
  );

  return res.status(201).json({ applicant: result.rows[0] });
});

router.post("/applicants/:id/generate-code", async (req, res) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid applicant id" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const applicantResult = await client.query(
      `SELECT id, student_name, parent_name, mobile_number, grade, status, test_code
       FROM applicants
       WHERE id = $1
       FOR UPDATE`,
      [parsed.data.id],
    );

    if (applicantResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Applicant not found" });
    }

    const applicant = applicantResult.rows[0];
    if (!["pending", "paid"].includes(applicant.status)) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Test code can only be generated for pending/paid applicants" });
    }

    const { applicantNumber, testCode } = await generateTestCode(client, applicant.grade);

    await client.query(
      `UPDATE applicants
       SET applicant_number = $2,
           test_code = $3,
           status = 'test_scheduled',
           updated_at = NOW()
       WHERE id = $1`,
      [applicant.id, applicantNumber, testCode],
    );

    await client.query(
      `INSERT INTO test_sessions (
         applicant_id,
         test_code,
         student_name,
         parent_name,
         mobile_number,
         grade,
         status,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'created', $7)
       ON CONFLICT (applicant_id)
       DO UPDATE SET
         test_code = EXCLUDED.test_code,
         student_name = EXCLUDED.student_name,
         parent_name = EXCLUDED.parent_name,
         mobile_number = EXCLUDED.mobile_number,
         grade = EXCLUDED.grade,
         status = 'created',
         start_time = NULL,
         end_time = NULL,
         score = NULL,
         score_english = NULL,
         score_math = NULL,
         score_science_evs = NULL,
         score_telugu = NULL,
         score_hindi = NULL,
         created_by = EXCLUDED.created_by,
       created_at = NOW(),
       test_date = CURRENT_DATE`,
      [applicant.id, testCode, applicant.student_name, applicant.parent_name, applicant.mobile_number, applicant.grade, req.user.sub],
    );

    const updatedApplicantResult = await client.query(
      `SELECT
         a.id,
         a.applicant_number,
         a.student_name,
         a.parent_name,
         a.mobile_number,
         a.grade,
         a.status,
         a.test_code,
         a.applied_at,
         a.updated_at,
         a.test_started_at,
         a.test_completed_at,
         a.total_tab_switches,
         ts.start_time,
         ts.end_time,
         COALESCE(ts.status, 'created') AS session_status
       FROM applicants a
       LEFT JOIN test_sessions ts ON ts.applicant_id = a.id
       WHERE a.id = $1`,
      [applicant.id],
    );

    await client.query("COMMIT");

    broadcastToAdmins("TEST_CREATED", {
      applicantId: applicant.id,
      studentName: applicant.student_name,
      grade: applicant.grade,
      testCode,
      displayCode: formatTestCodeForDisplay(testCode),
      status: "test_scheduled",
    });

    return res.status(201).json({
      applicantId: applicant.id,
      testCode,
      displayCode: formatTestCodeForDisplay(testCode),
      applicant: updatedApplicantResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Could not generate test code", details: error.message });
  } finally {
    client.release();
  }
});

router.delete("/applicants/:id", async (req, res) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid applicant id" });
  }

  const result = await pool.query(
    `DELETE FROM applicants
     WHERE id = $1
       AND status IN ('pending', 'test_scheduled')
     RETURNING id`,
    [parsed.data.id],
  );

  if (result.rowCount === 0) {
    return res.status(409).json({ error: "Only pending or scheduled applicants can be revoked" });
  }

  return res.json({ success: true });
});

router.get("/tests", async (_req, res) => {
  const result = await buildApplicantSelect(
    "a.status IN ('test_scheduled', 'test_started', 'test_completed', 'approved', 'rejected')",
  );

  const applicants = result.rows;
  return res.json({
    scheduled: applicants.filter((row) => row.status === "test_scheduled"),
    active: applicants.filter((row) => row.status === "test_started"),
    completed: applicants.filter((row) => row.status === "test_completed"),
  });
});

router.get("/active-tests", async (_req, res) => {
  const result = await buildApplicantSelect("a.status IN ('test_scheduled', 'test_started')");
  return res.json({ sessions: result.rows });
});

router.get("/active-sessions", async (_req, res) => {
  const result = await pool.query(
    `SELECT
       ts.id,
       ts.test_code,
       ts.student_name,
       ts.parent_name,
       ts.mobile_number,
       ts.grade,
       ts.status,
       ts.start_time,
       ts.created_at,
       ts.test_date,
       COALESCE(tse_counts.tab_switch_count, 0)::int AS tab_switch_count,
       COALESCE(answer_counts.answered_count, 0)::int AS answered_count,
       COALESCE(answer_counts.visited_count, 0)::int AS visited_count,
       COALESCE(answer_counts.marked_count, 0)::int AS marked_count,
       COALESCE(subject_counts.english_answered, 0)::int AS english_answered,
       COALESCE(subject_counts.english_total, 0)::int AS english_total,
       COALESCE(subject_counts.mathematics_answered, 0)::int AS mathematics_answered,
       COALESCE(subject_counts.mathematics_total, 0)::int AS mathematics_total,
       COALESCE(subject_counts.evs_answered, 0)::int AS evs_answered,
       COALESCE(subject_counts.evs_total, 0)::int AS evs_total,
       COALESCE(subject_counts.science_answered, 0)::int AS science_answered,
       COALESCE(subject_counts.science_total, 0)::int AS science_total,
       COALESCE(subject_counts.telugu_answered, 0)::int AS telugu_answered,
        COALESCE(subject_counts.telugu_total, 0)::int AS telugu_total,
       COALESCE(subject_counts.hindi_answered, 0)::int AS hindi_answered,
       COALESCE(subject_counts.hindi_total, 0)::int AS hindi_total,
       COALESCE((
         SELECT COUNT(*)::int
         FROM questions q
         WHERE q.class_level = ts.grade
       ), 0) AS total_questions
     FROM test_sessions ts
     JOIN applicants a ON a.id = ts.applicant_id
     LEFT JOIN (
       SELECT test_session_id, COUNT(*)::int AS tab_switch_count
       FROM tab_switch_events
       GROUP BY test_session_id
     ) tse_counts ON tse_counts.test_session_id = ts.id
     LEFT JOIN (
       SELECT
         test_session_id,
         COUNT(*) FILTER (WHERE answer_status IN ('ANSWERED', 'ANSWERED_MARKED'))::int AS answered_count,
         COUNT(*)::int AS visited_count,
         COUNT(*) FILTER (WHERE answer_status IN ('MARKED', 'ANSWERED_MARKED'))::int AS marked_count
       FROM answers
       GROUP BY test_session_id
     ) answer_counts ON answer_counts.test_session_id = ts.id
     LEFT JOIN (
       SELECT
         ts_inner.id AS test_session_id,
         COUNT(*) FILTER (WHERE LOWER(q.subject) LIKE '%eng%' AND a.answer_status IN ('ANSWERED', 'ANSWERED_MARKED'))::int AS english_answered,
         COUNT(*) FILTER (WHERE LOWER(q.subject) LIKE '%eng%')::int AS english_total,
         COUNT(*) FILTER (WHERE LOWER(q.subject) LIKE '%math%' AND a.answer_status IN ('ANSWERED', 'ANSWERED_MARKED'))::int AS mathematics_answered,
         COUNT(*) FILTER (WHERE LOWER(q.subject) LIKE '%math%')::int AS mathematics_total,
         COUNT(*) FILTER (WHERE LOWER(q.subject) LIKE '%evs%' AND a.answer_status IN ('ANSWERED', 'ANSWERED_MARKED'))::int AS evs_answered,
         COUNT(*) FILTER (WHERE LOWER(q.subject) LIKE '%evs%')::int AS evs_total,
         COUNT(*) FILTER (WHERE LOWER(q.subject) LIKE '%sci%' AND a.answer_status IN ('ANSWERED', 'ANSWERED_MARKED'))::int AS science_answered,
         COUNT(*) FILTER (WHERE LOWER(q.subject) LIKE '%sci%')::int AS science_total,
         COUNT(*) FILTER (WHERE LOWER(q.subject) LIKE '%telugu%' AND a.answer_status IN ('ANSWERED', 'ANSWERED_MARKED'))::int AS telugu_answered,
         COUNT(*) FILTER (WHERE LOWER(q.subject) LIKE '%telugu%')::int AS telugu_total,
         COUNT(*) FILTER (WHERE LOWER(q.subject) LIKE '%hindi%' AND a.answer_status IN ('ANSWERED', 'ANSWERED_MARKED'))::int AS hindi_answered,
         COUNT(*) FILTER (WHERE LOWER(q.subject) LIKE '%hindi%')::int AS hindi_total
       FROM test_sessions ts_inner
       JOIN questions q ON q.class_level = ts_inner.grade
       LEFT JOIN answers a ON a.test_session_id = ts_inner.id AND a.question_id = q.id
       GROUP BY ts_inner.id
     ) subject_counts ON subject_counts.test_session_id = ts.id
     WHERE a.status = 'test_started'
     ORDER BY ts.start_time ASC NULLS LAST`,
  );

  return res.json({ sessions: result.rows });
});

router.get("/test-history", async (_req, res) => {
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
       a.test_completed_at AS end_time,
       ts.start_time,
       ts.end_time,
       TO_CHAR(ts.start_time, 'HH12:MI:SS AM') AS start_time_ist,
       TO_CHAR(ts.end_time, 'HH12:MI:SS AM') AS end_time_ist,
       TO_CHAR(a.applied_at, 'DD/MM/YYYY') AS date_ist,
       a.total_tab_switches
     FROM applicants a
     LEFT JOIN test_sessions ts ON ts.applicant_id = a.id
     WHERE a.status IN ('test_completed', 'approved', 'rejected')
     ORDER BY a.test_completed_at DESC NULLS LAST, a.updated_at DESC`,
  );

  return res.json({ sessions: result.rows });
});

router.post("/end-test", async (req, res) => {
  const schema = z.object({
    testCode: z.string().regex(/^MPS\d{9}$/),
  });
  const parsed = schema.safeParse({
    testCode: normalizeTestCode(req.body?.testCode),
  });
  if (!parsed.success) {
    return res.status(400).json({ error: "testCode required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sessionResult = await client.query(
      `SELECT ts.id, ts.test_code, ts.student_name, ts.grade, ts.status, ts.applicant_id
       FROM test_sessions ts
       WHERE ts.test_code = $1
       FOR UPDATE`,
      [parsed.data.testCode],
    );

    if (sessionResult.rowCount === 0 || sessionResult.rows[0].status !== "started") {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Test not found or not started" });
    }

    const session = sessionResult.rows[0];
    const scores = await calculateScores(client, session.id);
    const totalQuestionsResult = await client.query(
      `SELECT COUNT(*)::int AS total_questions
       FROM questions
       WHERE class_level = $1`,
      [session.grade],
    );
    const tabSwitchResult = await client.query(
      `SELECT COALESCE(MAX(switch_count), 0)::int AS tab_switch_count
       FROM tab_switch_events
       WHERE test_session_id = $1`,
      [session.id],
    );

    await client.query(
      `UPDATE test_sessions
       SET status = 'finished',
           end_time = NOW(),
           score = $2,
           score_english = $3,
           score_math = $4,
           score_science_evs = $5,
           score_telugu = $6,
           score_hindi = $7
       WHERE id = $1`,
      [session.id, scores.total, scores.english, scores.math, scores.scienceEvs, scores.telugu, scores.hindi],
    );

    await client.query(
      `UPDATE applicants
       SET status = 'test_completed',
           test_completed_at = NOW(),
           updated_at = NOW(),
           total_tab_switches = $2,
           score = $3,
           score_english = $4,
           score_math = $5,
           score_science_evs = $6,
           score_telugu = $7,
           score_hindi = $8
       WHERE id = $1`,
      [
        session.applicant_id,
        tabSwitchResult.rows[0].tab_switch_count,
        scores.total,
        scores.english,
        scores.math,
        scores.scienceEvs,
        scores.telugu,
        scores.hindi,
      ],
    );

    await client.query("COMMIT");

    const totalQuestions = totalQuestionsResult.rows[0]?.total_questions || 0;
    const payload = {
      testCode: session.test_code,
      studentName: session.student_name,
      totalQuestions,
      forcedEnd: true,
    };
    broadcastToAdmins("TEST_SUBMITTED", payload);
    broadcastToAdminMonitor("STUDENT_FINISHED", payload);

    return res.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Could not end test", details: error.message });
  } finally {
    client.release();
  }
});

router.get("/tab-switches", async (_req, res) => {
  const result = await pool.query(
    `SELECT
       tse.id,
       ts.test_code,
       ts.student_name,
       ts.grade,
       tse.switched_at,
       tse.switch_count
     FROM tab_switch_events tse
     JOIN test_sessions ts ON ts.id = tse.test_session_id
     JOIN applicants a ON a.id = ts.applicant_id
     WHERE a.status = 'test_started'
     ORDER BY tse.switched_at DESC`,
  );

  return res.json({ events: result.rows });
});

module.exports = router;
