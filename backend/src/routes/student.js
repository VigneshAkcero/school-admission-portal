const express = require("express");
const rateLimit = require("express-rate-limit");
const pool = require("../db/pool");
const { normalizeTestCode } = require("../utils/codeGenerator");
const { saveAnswerSchema, verifyCodeSchema } = require("../utils/validators");
const { calculateScores } = require("../utils/scoring");
const { broadcastToAdmins, broadcastToAdminMonitor } = require("../websocket/hub");

const TEST_DURATION_MINUTES = 45;

function deriveAnswerStatus(payload) {
  if (payload.answerStatus) return payload.answerStatus;
  const selectedOption = payload.selectedOption ?? null;
  const markedForReview = payload.markedForReview ?? false;
  if (markedForReview && selectedOption !== null) return "ANSWERED_MARKED";
  if (markedForReview) return "MARKED";
  if (selectedOption !== null) return "ANSWERED";
  return "NOT_VISITED";
}

const router = express.Router();
const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => normalizeTestCode(req.body?.testCode || req.ip),
  message: { error: "Too many submit attempts. Please wait and retry." },
});

router.post("/start-test", async (req, res) => {
  const parsed = verifyCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const normalizedCode = normalizeTestCode(parsed.data.testCode);
  if (!/^MPS\d{9}$/.test(normalizedCode)) {
    return res.status(400).json({ error: "Invalid test code format." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const sessionResult = await client.query(
      `SELECT
         ts.id,
         ts.test_code,
         ts.student_name,
         ts.grade,
         ts.status,
         ts.start_time,
         ts.applicant_id,
         a.status AS applicant_status
       FROM test_sessions ts
       JOIN applicants a ON a.id = ts.applicant_id
       WHERE ts.test_code = $1
       FOR UPDATE`,
      [normalizedCode],
    );

    if (sessionResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Invalid test code" });
    }

    const session = sessionResult.rows[0];
    if (session.applicant_status !== "test_scheduled" || session.status !== "created") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Test cannot be started again" });
    }

    await client.query(
      `UPDATE test_sessions
       SET status = 'started', start_time = NOW()
       WHERE id = $1`,
      [session.id],
    );

    await client.query(
      `UPDATE applicants
       SET status = 'test_started',
           test_started_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [session.applicant_id],
    );

    const questionsResult = await client.query(
      `SELECT id, class_level, subject, question_type, passage_text, passage_group,
              question_text, option_a, option_b, option_c, option_d, image_required
       FROM questions
       WHERE class_level = $1
       ORDER BY subject ASC, COALESCE(passage_group, id) ASC, id ASC`,
      [session.grade],
    );

    await client.query("COMMIT");

    const questions = questionsResult.rows.map((q) => ({
      id: q.id,
      classLevel: q.class_level,
      subject: q.subject,
      questionType: q.question_type,
      passageText: q.passage_text,
      passageGroup: q.passage_group,
      questionText: q.question_text,
      options: {
        a: q.option_a,
        b: q.option_b,
        c: q.option_c,
        d: q.option_d,
      },
      imageRequired: q.image_required,
    }));

    broadcastToAdmins("TEST_STARTED", {
      testCode: session.test_code,
      studentName: session.student_name,
      grade: session.grade,
      currentQuestionNumber: 1,
      currentSubject: questions[0]?.subject || null,
      timeRemainingSeconds: TEST_DURATION_MINUTES * 60,
      tabSwitchCount: 0,
    });

    return res.json({
      testCode: session.test_code,
      studentName: session.student_name,
      grade: session.grade,
      durationMinutes: TEST_DURATION_MINUTES,
      questions,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Could not start test", details: error.message });
  } finally {
    client.release();
  }
});

router.post("/save-answer", async (req, res) => {
  const parsed = saveAnswerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const payload = parsed.data;
  const normalizedCode = normalizeTestCode(payload.testCode);
  if (!/^MPS\d{9}$/.test(normalizedCode)) {
    return res.status(400).json({ error: "Invalid test code format." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sessionResult = await client.query(
      `SELECT id, test_code, student_name, grade, status
       FROM test_sessions
       WHERE test_code = $1
       FOR UPDATE`,
      [normalizedCode],
    );

    if (sessionResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Session not found" });
    }

    const session = sessionResult.rows[0];
    if (session.status !== "started") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Test is not active" });
    }

    const answerStatus = deriveAnswerStatus(payload);
    const selectedOption = payload.selectedOption ?? null;
    const markedForReview = answerStatus === "MARKED" || answerStatus === "ANSWERED_MARKED";

    if (answerStatus === "NOT_VISITED" && selectedOption === null) {
      await client.query(
        `DELETE FROM answers
         WHERE test_session_id = $1 AND question_id = $2`,
        [session.id, payload.questionId],
      );
    } else {
      await client.query(
        `INSERT INTO answers (test_session_id, question_id, selected_option, is_marked_for_review, answer_status, answered_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (test_session_id, question_id)
         DO UPDATE SET selected_option = EXCLUDED.selected_option,
                       is_marked_for_review = EXCLUDED.is_marked_for_review,
                       answer_status = EXCLUDED.answer_status,
                       answered_at = NOW()`,
        [
          session.id,
          payload.questionId,
          selectedOption,
          markedForReview,
          answerStatus,
        ],
      );
    }

    await client.query("COMMIT");

    const [progressCountResult, tabSwitchResult, totalQuestionsResult, subjectProgressResult, subjectTotalResult] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE answer_status IN ('ANSWERED', 'ANSWERED_MARKED'))::int AS answered_count,
           COUNT(*) FILTER (WHERE answer_status IN ('MARKED', 'ANSWERED_MARKED'))::int AS marked_count
         FROM answers
         WHERE test_session_id = $1`,
        [session.id],
      ),
      pool.query(
        `SELECT COALESCE(MAX(switch_count), 0)::int AS tab_switch_count
         FROM tab_switch_events
         WHERE test_session_id = $1`,
        [session.id],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total_questions
         FROM questions
         WHERE class_level = $1`,
        [session.grade],
      ),
      pool.query(
        `SELECT COUNT(*) FILTER (WHERE a.answer_status IN ('ANSWERED', 'ANSWERED_MARKED'))::int AS answered_count_in_subject
         FROM answers a
         JOIN questions q ON q.id = a.question_id
         WHERE a.test_session_id = $1
           AND LOWER(q.subject) = LOWER($2)`,
        [session.id, payload.currentSubject ?? ""],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total_questions_in_subject
         FROM questions
         WHERE class_level = $1
           AND LOWER(subject) = LOWER($2)`,
        [session.grade, payload.currentSubject ?? ""],
      ),
    ]);

    const answeredCount = progressCountResult.rows[0].answered_count;
    const markedCount = progressCountResult.rows[0].marked_count;
    const tabSwitchCount = tabSwitchResult.rows[0].tab_switch_count;
    const totalQuestions = totalQuestionsResult.rows[0].total_questions;
    const answeredCountInSubject = subjectProgressResult.rows[0].answered_count_in_subject;
    const totalQuestionsInSubject = subjectTotalResult.rows[0].total_questions_in_subject;

    broadcastToAdmins("ANSWER_SAVED", {
      testCode: session.test_code,
      studentName: session.student_name,
      grade: session.grade,
      currentQuestionNumber: payload.currentQuestionNumber ?? null,
      currentSubject: payload.currentSubject ?? null,
      timeRemainingSeconds: payload.timeRemainingSeconds ?? null,
    });
    broadcastToAdminMonitor("STUDENT_PROGRESS", {
      testCode: session.test_code,
      studentName: session.student_name,
      grade: session.grade,
      currentQuestionIndex: payload.currentQuestionNumber ?? null,
      totalQuestions,
      subject: payload.currentSubject ?? null,
      answeredCount,
      answeredCountInSubject,
      markedCount,
      timeRemainingSeconds: payload.timeRemainingSeconds ?? null,
      tabSwitchCount,
      totalQuestionsInSubject,
    });

    return res.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Could not save answer", details: error.message });
  } finally {
    client.release();
  }
});

router.post("/submit-test", submitLimiter, async (req, res) => {
  const parsed = verifyCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const normalizedCode = normalizeTestCode(parsed.data.testCode);
  if (!/^MPS\d{9}$/.test(normalizedCode)) {
    return res.status(400).json({ error: "Invalid test code format." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const sessionResult = await client.query(
      `SELECT id, test_code, student_name, grade, status, start_time, applicant_id
       FROM test_sessions
       WHERE test_code = $1
       FOR UPDATE`,
      [normalizedCode],
    );

    if (sessionResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Session not found" });
    }

    const session = sessionResult.rows[0];

    if (session.status === "finished") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Test already submitted" });
    }

    if (session.status !== "started") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Test has not started" });
    }

    const startedAt = new Date(session.start_time);
    const elapsedSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);
    const timedOut = elapsedSeconds >= TEST_DURATION_MINUTES * 60;

    const [scores, questionCountResult, tabSwitchResult] = await Promise.all([
      calculateScores(client, session.id),
      client.query(
        `SELECT COUNT(*)::int AS total_questions
         FROM questions
         WHERE class_level = $1`,
        [session.grade],
      ),
      client.query(
        `SELECT COALESCE(MAX(switch_count), 0)::int AS tab_switch_count
         FROM tab_switch_events
         WHERE test_session_id = $1`,
        [session.id],
      ),
    ]);

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

    const totalQuestions = questionCountResult.rows[0].total_questions;

    broadcastToAdmins("TEST_SUBMITTED", {
      testCode: session.test_code,
      studentName: session.student_name,
      grade: session.grade,
      totalQuestions,
    });
    broadcastToAdminMonitor("STUDENT_FINISHED", {
      testCode: session.test_code,
      studentName: session.student_name,
      totalQuestions,
      timedOut,
    });

    return res.json({
      success: true,
      timedOut,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Could not submit test", details: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
