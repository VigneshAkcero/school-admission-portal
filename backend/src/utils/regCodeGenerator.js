const pool = require("../db/pool");

/**
 * Generates a unique Registration Code for a new application.
 *
 * Format: MPSYYYYMMGGXXX
 */
async function generateRegCode(grade) {
  const result = await pool.query(`
    UPDATE reg_code_counter
    SET last_value = CASE WHEN last_value >= 999 THEN 1 ELSE last_value + 1 END
    WHERE id = 1
    RETURNING last_value
  `);

  const counter = result.rows[0]?.last_value;
  if (!counter) {
    throw new Error("Unable to allocate registration code counter");
  }

  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const gg = String(grade).padStart(2, "0");
  const xxx = String(counter).padStart(3, "0");

  return `MPS${yyyy}${mm}${gg}${xxx}`;
}

module.exports = { generateRegCode };
