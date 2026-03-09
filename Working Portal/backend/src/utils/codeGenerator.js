const pool = require("../db/pool");

function normalizeTestCode(testCode) {
  return String(testCode || "").replace(/\D/g, "");
}

function formatTestCode(raw) {
  const normalized = normalizeTestCode(raw);
  if (normalized.length !== 9) return raw;
  return `${normalized.slice(0, 2)}-${normalized.slice(2, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6)}`;
}

async function generateTestCode(gradeOrClient, maybeGrade) {
  const client = typeof maybeGrade === "number" ? gradeOrClient : pool;
  const grade = typeof maybeGrade === "number" ? maybeGrade : gradeOrClient;

  await client.query(`
    INSERT INTO test_code_counter (id, last_value)
    VALUES (1, 0)
    ON CONFLICT (id) DO NOTHING
  `);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const result = await client.query(`
      UPDATE test_code_counter
      SET last_value = CASE
        WHEN last_value >= 999 THEN 1
        ELSE last_value + 1
      END
      WHERE id = 1
      RETURNING last_value
    `);

    const counter = result.rows[0]?.last_value;
    if (!counter) {
      continue;
    }

    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const gg = String(grade).padStart(2, "0");
    const xxx = String(counter).padStart(3, "0");
    const testCode = `${yy}${mm}${gg}${xxx}`;

    const conflictCheck = await client.query(
      `SELECT 1
       FROM applicants
       WHERE applicant_number = $1 OR test_code = $2
       UNION ALL
       SELECT 1
       FROM test_sessions
       WHERE test_code = $2
       LIMIT 1`,
      [counter, testCode],
    );

    if (conflictCheck.rowCount === 0) {
      return {
        applicantNumber: counter,
        testCode,
      };
    }
  }

  throw new Error("Unable to allocate a unique test code");
}

module.exports = {
  generateTestCode,
  normalizeTestCode,
  formatTestCode,
  formatTestCodeForDisplay: formatTestCode,
};
