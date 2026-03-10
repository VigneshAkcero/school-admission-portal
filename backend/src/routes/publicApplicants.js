const express = require("express");
const pool = require("../db/pool");
const { normalizeTestCode } = require("../utils/codeGenerator");
const { feedbackSchema } = require("../utils/validators");

const router = express.Router();

router.post("/feedback", async (req, res) => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const testCode = normalizeTestCode(parsed.data.testCode);
  const { rating } = parsed.data;

  try {
    const result = await pool.query(
      `UPDATE applicants
       SET feedback_rating = $2,
           feedback_submitted_at = NOW(),
           updated_at = NOW()
       WHERE test_code = $1
       RETURNING id, test_code, feedback_rating, feedback_submitted_at`,
      [testCode, rating],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Applicant not found for this test code" });
    }

    return res.json({
      ok: true,
      feedback: {
        testCode: result.rows[0].test_code,
        rating: result.rows[0].feedback_rating,
        submittedAt: result.rows[0].feedback_submitted_at,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Could not save feedback", details: error.message });
  }
});

module.exports = router;
