const pool = require("./pool");
const bcrypt = require("bcryptjs");

async function migrate() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('admin', 'principal');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await pool.query(`
    DO $$ BEGIN
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'receptionist';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE session_status AS ENUM ('created', 'started', 'finished');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE applicant_status AS ENUM (
        'pending',
        'test_scheduled',
        'test_started',
        'test_completed',
        'approved',
        'rejected',
        'revoked'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role user_role NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS name VARCHAR(255);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS applicants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      applicant_number INTEGER UNIQUE NULL,
      student_name VARCHAR(255) NOT NULL,
      parent_name VARCHAR(255) NOT NULL,
      mobile_number VARCHAR(32) NOT NULL,
      grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 9),
      status applicant_status NOT NULL DEFAULT 'pending',
      test_code VARCHAR(9) UNIQUE NULL,
      created_by UUID REFERENCES users(id),
      decision_by UUID REFERENCES users(id),
      applied_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now(),
      test_started_at TIMESTAMP NULL,
      test_completed_at TIMESTAMP NULL,
      total_tab_switches INTEGER NOT NULL DEFAULT 0,
      last_tab_switch_at TIMESTAMP NULL,
      score INTEGER NULL,
      score_english INTEGER NULL,
      score_math INTEGER NULL,
      score_science_evs INTEGER NULL,
      decision_at TIMESTAMP NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS test_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      test_code VARCHAR(9) UNIQUE NOT NULL,
      student_name VARCHAR(255) NOT NULL,
      parent_name VARCHAR(255) NOT NULL,
      mobile_number VARCHAR(32) NOT NULL,
      grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 9),
      status session_status NOT NULL DEFAULT 'created',
      created_by UUID REFERENCES users(id),
      start_time TIMESTAMP NULL,
      end_time TIMESTAMP NULL,
      score INTEGER NULL,
      score_english INTEGER NULL,
      score_math INTEGER NULL,
      score_science_evs INTEGER NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      test_date DATE NOT NULL DEFAULT CURRENT_DATE
    );
  `);

  await pool.query(`
    ALTER TABLE test_sessions
    ADD COLUMN IF NOT EXISTS applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE;
  `);

  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE test_sessions
      ADD CONSTRAINT test_sessions_applicant_id_key UNIQUE (applicant_id);
    EXCEPTION
      WHEN duplicate_table THEN null;
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS test_code_counter (
      id INTEGER PRIMARY KEY DEFAULT 1,
      last_value INTEGER NOT NULL DEFAULT 0,
      CHECK (id = 1)
    );
  `);

  await pool.query(`
    INSERT INTO test_code_counter (id, last_value)
    VALUES (1, 0)
    ON CONFLICT (id) DO NOTHING;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tab_switch_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
      switched_at TIMESTAMP NOT NULL DEFAULT now(),
      switch_count INTEGER NOT NULL DEFAULT 1,
      reason VARCHAR(32) NULL
    );
  `);

  await pool.query(`
    ALTER TABLE tab_switch_events
    ADD COLUMN IF NOT EXISTS reason VARCHAR(32) NULL;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS answers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
      question_id VARCHAR(64) NOT NULL,
      selected_option CHAR(1) NULL,
      is_marked_for_review BOOLEAN NOT NULL DEFAULT false,
      answer_status VARCHAR(32) NOT NULL DEFAULT 'NOT_VISITED',
      answered_at TIMESTAMP NOT NULL DEFAULT now(),
      UNIQUE(test_session_id, question_id)
    );
  `);

  await pool.query(`
    ALTER TABLE answers
    ADD COLUMN IF NOT EXISTS answer_status VARCHAR(32) NOT NULL DEFAULT 'NOT_VISITED';
  `);

  await pool.query(`
    UPDATE answers
    SET answer_status = CASE
      WHEN is_marked_for_review = true AND selected_option IS NOT NULL THEN 'ANSWERED_MARKED'
      WHEN is_marked_for_review = true THEN 'MARKED'
      WHEN selected_option IS NOT NULL THEN 'ANSWERED'
      ELSE 'NOT_VISITED'
    END
    WHERE answer_status IS NULL
       OR answer_status NOT IN ('NOT_VISITED', 'ANSWERED', 'ANSWERED_MARKED', 'MARKED', 'NOT_ANSWERED');
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id VARCHAR(64) PRIMARY KEY,
      class_level INTEGER NOT NULL,
      subject VARCHAR(64) NOT NULL,
      skill_tag VARCHAR(128) NULL,
      difficulty VARCHAR(64) NULL,
      question_type VARCHAR(32) NOT NULL,
      passage_text TEXT NULL,
      passage_group VARCHAR(128) NULL,
      question_text TEXT NOT NULL,
      option_a VARCHAR(512) NOT NULL,
      option_b VARCHAR(512) NOT NULL,
      option_c VARCHAR(512) NOT NULL,
      option_d VARCHAR(512) NOT NULL,
      correct_option CHAR(1) NOT NULL,
      image_required BOOLEAN NOT NULL DEFAULT false
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_applicants_status ON applicants(status);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_applicants_applied_at ON applicants(applied_at DESC);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_test_sessions_date_grade ON test_sessions(test_date, grade);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_test_sessions_status ON test_sessions(status);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_answers_test_session ON answers(test_session_id);
  `);

  await pool.query(`
    ALTER TABLE applicants
    ADD COLUMN IF NOT EXISTS feedback_rating INTEGER NULL CHECK (feedback_rating BETWEEN 1 AND 5);
  `);

  await pool.query(`
    ALTER TABLE applicants
    ADD COLUMN IF NOT EXISTS feedback_submitted_at TIMESTAMP NULL;
  `);

  await pool.query(`
    INSERT INTO applicants (
      student_name,
      parent_name,
      mobile_number,
      grade,
      status,
      test_code,
      created_by,
      applied_at,
      updated_at,
      test_started_at,
      test_completed_at,
      total_tab_switches,
      score,
      score_english,
      score_math,
      score_science_evs,
      applicant_number
    )
    SELECT
      ts.student_name,
      ts.parent_name,
      ts.mobile_number,
      ts.grade,
      CASE
        WHEN ts.status = 'finished' THEN 'test_completed'::applicant_status
        WHEN ts.status = 'started' THEN 'test_started'::applicant_status
        ELSE 'test_scheduled'::applicant_status
      END,
      ts.test_code,
      ts.created_by,
      ts.created_at,
      COALESCE(ts.end_time, ts.start_time, ts.created_at),
      ts.start_time,
      ts.end_time,
      COALESCE(tse.max_count, 0),
      ts.score,
      ts.score_english,
      ts.score_math,
      ts.score_science_evs,
      NULLIF(RIGHT(ts.test_code, 3), '')::INTEGER
    FROM test_sessions ts
    LEFT JOIN (
      SELECT test_session_id, MAX(switch_count)::int AS max_count
      FROM tab_switch_events
      GROUP BY test_session_id
    ) tse ON tse.test_session_id = ts.id
    LEFT JOIN applicants existing ON existing.test_code = ts.test_code
    WHERE ts.applicant_id IS NULL
      AND existing.id IS NULL;
  `);

  await pool.query(`
    UPDATE test_sessions ts
    SET applicant_id = a.id
    FROM applicants a
    WHERE ts.applicant_id IS NULL
      AND a.test_code = ts.test_code;
  `);

  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin";
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin";
  const principalEmail = process.env.DEFAULT_PRINCIPAL_EMAIL || "principal";
  const principalPassword = process.env.DEFAULT_PRINCIPAL_PASSWORD || "principal";
  const receptionistEmail = process.env.DEFAULT_RECEPTIONIST_EMAIL || "reception";
  const receptionistPassword = process.env.DEFAULT_RECEPTIONIST_PASSWORD || "reception";

  const users = [
    {
      email: adminEmail,
      password: adminPassword,
      role: "admin",
      name: process.env.DEFAULT_ADMIN_NAME || "Admin",
    },
    {
      email: principalEmail,
      password: principalPassword,
      role: "principal",
      name: process.env.DEFAULT_PRINCIPAL_NAME || "Principal",
    },
    {
      email: receptionistEmail,
      password: receptionistPassword,
      role: "receptionist",
      name: process.env.DEFAULT_RECEPTIONIST_NAME || "Receptionist",
    },
  ];

  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, role, name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email)
       DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         name = COALESCE(users.name, EXCLUDED.name)`,
      [user.email.toLowerCase(), hash, user.role, user.name],
    );
  }
}

module.exports = migrate;
