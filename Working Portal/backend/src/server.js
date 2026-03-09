const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const config = require("./config");
const migrate = require("./db/migrate");
const seedQuestions = require("./db/seedQuestions");
const pool = require("./db/pool");
const { calculateScores } = require("./utils/scoring");
const { attachWebSocketServer, broadcastToAdmins, broadcastToAdminMonitor, sendToStudent } = require("./websocket/hub");
const { authenticateAdmin, authorizeRoles } = require("./middleware/auth");

const authRoutes = require("./routes/auth");
const receptionistRoutes = require("./routes/receptionist");
const adminRoutes = require("./routes/admin");
const principalRoutes = require("./routes/principal");
const studentRoutes = require("./routes/student");
const wsEventRoutes = require("./routes/wsEvents");

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "1mb" }));

const adminCors = cors({
  origin: config.adminOrigins,
  credentials: true,
});

const studentCors = cors({
  origin: config.studentOrigins,
  credentials: true,
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "montessori-admission-api" });
});

app.use("/api/auth/login", adminCors);
app.use("/api/auth/verify-code", studentCors);
app.use("/api/auth", authRoutes);

app.use("/api/receptionist", adminCors, authenticateAdmin, authorizeRoles("receptionist"), receptionistRoutes);
app.use("/api/admin", adminCors, authenticateAdmin, authorizeRoles("admin"), adminRoutes);
app.use("/api/principal", adminCors, authenticateAdmin, authorizeRoles("principal"), principalRoutes);
app.use("/api/student", studentCors, studentRoutes);
app.use("/api/ws", studentCors, wsEventRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

const EXAM_DURATION_MINUTES = 45;

function startAutoSubmitJob() {
  setInterval(async () => {
    try {
      const expired = await pool.query(
        `SELECT id, test_code, student_name, grade, applicant_id
         FROM test_sessions
         WHERE status = 'started'
           AND start_time IS NOT NULL
           AND start_time < NOW() - INTERVAL '${EXAM_DURATION_MINUTES} minutes'`,
      );

      for (const session of expired.rows) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const lock = await client.query(
            `SELECT id, status
             FROM test_sessions
             WHERE id = $1
             FOR UPDATE`,
            [session.id],
          );
          if (lock.rowCount === 0 || lock.rows[0].status !== "started") {
            await client.query("ROLLBACK");
            continue;
          }

          const scoreResult = await calculateScores(client, session.id);
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
                 score = $1,
                 score_english = $2,
                 score_math = $3,
                 score_science_evs = $4
             WHERE id = $5`,
            [scoreResult.total, scoreResult.english, scoreResult.math, scoreResult.scienceEvs, session.id],
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
                 score_science_evs = $6
             WHERE id = $1`,
            [
              session.applicant_id,
              tabSwitchResult.rows[0].tab_switch_count,
              scoreResult.total,
              scoreResult.english,
              scoreResult.math,
              scoreResult.scienceEvs,
            ],
          );
          await client.query("COMMIT");

          const totalQuestions = totalQuestionsResult.rows[0]?.total_questions || 0;
          const finishedPayload = {
            testCode: session.test_code,
            studentName: session.student_name,
            totalQuestions,
            reason: "timeout",
          };
          broadcastToAdmins("TEST_SUBMITTED", {
            testCode: session.test_code,
            studentName: session.student_name,
            grade: session.grade,
            totalQuestions,
          });
          broadcastToAdminMonitor("STUDENT_FINISHED", finishedPayload);
          sendToStudent(session.test_code, { type: "TIME_UP", testCode: session.test_code });
        } catch (error) {
          await client.query("ROLLBACK");
          console.error("Auto-submit session error:", error);
        } finally {
          client.release();
        }
      }
    } catch (error) {
      console.error("Auto-submit job error:", error);
    }
  }, 60 * 1000);
}

async function start() {
  await migrate();
  const seededCount = await seedQuestions();
  startAutoSubmitJob();
  const server = http.createServer(app);
  attachWebSocketServer(server);

  server.listen(config.port, () => {
    console.log(`API running on port ${config.port}`);
    console.log(`Questions upserted: ${seededCount}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
