const fs = require("fs");
const path = require("path");
const pool = require("./pool");

async function seedQuestions() {
  const questionFile = path.resolve(process.cwd(), "question_bank.json");
  if (!fs.existsSync(questionFile)) {
    throw new Error(`question_bank.json not found at ${questionFile}`);
  }

  const raw = fs.readFileSync(questionFile, "utf-8");
  const parsed = JSON.parse(raw);
  const questions = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.questions)
      ? parsed.questions
      : null;

  if (!questions) {
    throw new Error("question_bank.json must be an array or contain a top-level 'questions' array");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const q of questions) {
      await client.query(
        `INSERT INTO questions (
          id, class_level, subject, skill_tag, difficulty, question_type,
          passage_text, passage_group, question_text, option_a, option_b, option_c, option_d,
          correct_option, image_required
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
        )
        ON CONFLICT (id) DO UPDATE SET
          class_level = EXCLUDED.class_level,
          subject = EXCLUDED.subject,
          skill_tag = EXCLUDED.skill_tag,
          difficulty = EXCLUDED.difficulty,
          question_type = EXCLUDED.question_type,
          passage_text = EXCLUDED.passage_text,
          passage_group = EXCLUDED.passage_group,
          question_text = EXCLUDED.question_text,
          option_a = EXCLUDED.option_a,
          option_b = EXCLUDED.option_b,
          option_c = EXCLUDED.option_c,
          option_d = EXCLUDED.option_d,
          correct_option = EXCLUDED.correct_option,
          image_required = EXCLUDED.image_required`,
        [
          q.id,
          q.class_level,
          q.subject,
          q.skill_tag || null,
          q.difficulty || null,
          q.question_type,
          q.passage_text || null,
          q.passage_group || null,
          q.question_text,
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
          q.correct_option,
          Boolean(q.image_required),
        ],
      );
    }

    await client.query("COMMIT");
    return questions.length;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = seedQuestions;
