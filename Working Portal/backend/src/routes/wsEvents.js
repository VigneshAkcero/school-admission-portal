const express = require("express");
const pool = require("../db/pool");
const { normalizeTestCode } = require("../utils/codeGenerator");
const { verifyCodeSchema } = require("../utils/validators");
const { broadcastToAdmins, broadcastToAdminMonitor } = require("../websocket/hub");

const router = express.Router();

router.post("/tab-switch", async (req, res) => {
  const parsed = verifyCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const normalizedCode = normalizeTestCode(parsed.data.testCode);

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
      return res.status(409).json({ error: "Session is not active" });
    }

    const prevCountResult = await client.query(
      `SELECT COALESCE(MAX(switch_count), 0)::int AS count
       FROM tab_switch_events
       WHERE test_session_id = $1`,
      [session.id],
    );

    const nextCount = prevCountResult.rows[0].count + 1;

    await client.query(
      `INSERT INTO tab_switch_events (test_session_id, switched_at, switch_count, reason)
       VALUES ($1, NOW(), $2, $3)`,
      [session.id, nextCount, req.body?.reason || null],
    );

    await client.query(
      `UPDATE applicants
       SET total_tab_switches = $2,
           last_tab_switch_at = NOW(),
           updated_at = NOW()
       WHERE id = (
         SELECT applicant_id
         FROM test_sessions
         WHERE id = $1
       )`,
      [session.id, nextCount],
    );

    await client.query("COMMIT");

    broadcastToAdmins("TAB_SWITCH", {
      testCode: session.test_code,
      studentName: session.student_name,
      grade: session.grade,
      count: nextCount,
      switchedAt: new Date().toISOString(),
    });
    broadcastToAdminMonitor("TAB_SWITCH", {
      testCode: session.test_code,
      studentName: session.student_name,
      grade: session.grade,
      count: nextCount,
      switchedAt: new Date().toISOString(),
    });

    return res.json({ ok: true, switchCount: nextCount });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Could not record tab switch", details: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
