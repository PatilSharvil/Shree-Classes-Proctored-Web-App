const { Pool } = require('pg');
const env = require('./env');

// CockroachDB requires SSL in production. The `pg` driver handles this automatically
// when the connection string contains `sslmode=require` (which CockroachDB connection
// strings include by default).
const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,                  // max pool connections
  idleTimeoutMillis: 30000, // close idle clients after 30s
  connectionTimeoutMillis: 10000, // abort connection attempt after 10s
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

/**
 * Execute a query against the pool.
 * @param {string} text  - SQL query with $1, $2, ... placeholders
 * @param {Array}  params - Parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

/**
 * Run the schema initialisation queries (CREATE TABLE IF NOT EXISTS).
 * Called once on server startup.
 */
const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log('Initializing database schema...');

    // Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        role TEXT NOT NULL CHECK(role IN ('ADMIN', 'STUDENT')),
        must_change_password INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Exams
    await client.query(`
      CREATE TABLE IF NOT EXISTS exams (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        subject TEXT,
        duration_minutes INTEGER NOT NULL,
        total_marks INTEGER NOT NULL,
        negative_marks REAL DEFAULT 0,
        passing_percentage REAL DEFAULT 0,
        scheduled_start TEXT,
        scheduled_end TEXT,
        is_active INTEGER DEFAULT 1,
        tab_switch_threshold INTEGER DEFAULT 5,
        looking_away_threshold INTEGER DEFAULT 5,
        created_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Questions
    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        exam_id TEXT NOT NULL,
        question_text TEXT NOT NULL,
        question_image TEXT,
        option_a TEXT NOT NULL,
        option_a_image TEXT,
        option_b TEXT NOT NULL,
        option_b_image TEXT,
        option_c TEXT NOT NULL,
        option_c_image TEXT,
        option_d TEXT NOT NULL,
        option_d_image TEXT,
        correct_option TEXT NOT NULL CHECK(correct_option IN ('A', 'B', 'C', 'D')),
        marks INTEGER DEFAULT 1,
        negative_marks REAL DEFAULT 0,
        difficulty TEXT DEFAULT 'MEDIUM' CHECK(difficulty IN ('EASY', 'MEDIUM', 'HARD')),
        explanation TEXT,
        explanation_image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
      )
    `);

    // Exam sessions
    await client.query(`
      CREATE TABLE IF NOT EXISTS exam_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        exam_id TEXT NOT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        submitted_at TIMESTAMP,
        status TEXT DEFAULT 'IN_PROGRESS' CHECK(status IN ('IN_PROGRESS', 'PAUSED', 'SUBMITTED', 'AUTO_SUBMITTED')),
        current_question_index INTEGER DEFAULT 0,
        total_questions INTEGER,
        score INTEGER DEFAULT 0,
        attempted_count INTEGER DEFAULT 0,
        correct_count INTEGER DEFAULT 0,
        violation_count INTEGER DEFAULT 0,
        last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (exam_id) REFERENCES exams(id)
      )
    `);

    // Responses
    await client.query(`
      CREATE TABLE IF NOT EXISTS responses (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        question_id TEXT NOT NULL,
        selected_option TEXT,
        is_correct INTEGER DEFAULT 0,
        marks_awarded REAL DEFAULT 0,
        answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id)
      )
    `);

    // Violations
    await client.query(`
      CREATE TABLE IF NOT EXISTS violations (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        severity TEXT DEFAULT 'MEDIUM' CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        confidence_score REAL DEFAULT 0,
        snapshot_id TEXT,
        metadata TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Proctoring snapshots
    await client.query(`
      CREATE TABLE IF NOT EXISTS proctoring_snapshots (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        violation_id TEXT,
        file_path TEXT NOT NULL,
        file_size INTEGER DEFAULT 0,
        detection_type TEXT NOT NULL,
        confidence REAL NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (violation_id) REFERENCES violations(id) ON DELETE SET NULL
      )
    `);

    // Proctoring logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS proctoring_logs (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_data TEXT,
        ip_address TEXT,
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_violation INTEGER DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE
      )
    `);

    // Attempt history
    await client.query(`
      CREATE TABLE IF NOT EXISTS attempt_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        exam_id TEXT NOT NULL,
        session_id TEXT,
        score INTEGER,
        total_marks INTEGER,
        percentage REAL,
        correct_count INTEGER,
        incorrect_count INTEGER,
        unattempted_count INTEGER,
        duration_taken INTEGER,
        started_at TEXT,
        submitted_at TEXT,
        status TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (exam_id) REFERENCES exams(id)
      )
    `);

    // Indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_exams_active ON exams(is_active)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_questions_exam ON questions(exam_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON exam_sessions(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_status ON exam_sessions(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_responses_session ON responses(session_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_violations_session ON violations(session_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_attempt_history_user ON attempt_history(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_snapshots_session ON proctoring_snapshots(session_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_snapshots_violation ON proctoring_snapshots(violation_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_proctoring_logs_session ON proctoring_logs(session_id)`);

    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { query, pool, initializeDatabase };
