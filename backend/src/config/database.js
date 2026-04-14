const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const env = require('./env');

// Ensure data directory exists
const dbDir = path.dirname(env.sqliteDbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(env.sqliteDbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
const initializeDatabase = () => {
  console.log('Initializing database...');
  
  // Users table (cached from Excel)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'STUDENT')),
      must_change_password INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Exams table
  db.exec(`
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Add tab_switch_threshold column if it doesn't exist (safe migration)
  try {
    db.exec(`ALTER TABLE exams ADD COLUMN tab_switch_threshold INTEGER DEFAULT 5`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Add looking_away_threshold column if it doesn't exist (safe migration)
  try {
    db.exec(`ALTER TABLE exams ADD COLUMN looking_away_threshold INTEGER DEFAULT 5`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Questions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      question_type TEXT DEFAULT 'TEXT' CHECK(question_type IN ('TEXT', 'IMAGE')),
      question_text TEXT,
      option_a TEXT,
      option_b TEXT,
      option_c TEXT,
      option_d TEXT,
      correct_option TEXT NOT NULL CHECK(correct_option IN ('A', 'B', 'C', 'D')),
      marks INTEGER DEFAULT 1,
      negative_marks REAL DEFAULT 0,
      difficulty TEXT DEFAULT 'MEDIUM' CHECK(difficulty IN ('EASY', 'MEDIUM', 'HARD')),
      explanation TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    )
  `);

  // Exam sessions table (active exams)
  db.exec(`
    CREATE TABLE IF NOT EXISTS exam_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      exam_id TEXT NOT NULL,
      started_at TEXT DEFAULT (datetime('now')),
      submitted_at TEXT,
      status TEXT DEFAULT 'IN_PROGRESS' CHECK(status IN ('IN_PROGRESS', 'PAUSED', 'SUBMITTED', 'AUTO_SUBMITTED')),
      current_question_index INTEGER DEFAULT 0,
      total_questions INTEGER,
      score INTEGER DEFAULT 0,
      attempted_count INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      violation_count INTEGER DEFAULT 0,
      last_activity_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (exam_id) REFERENCES exams(id)
    )
  `);

  // Responses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      selected_option TEXT,
      is_correct INTEGER DEFAULT 0,
      marks_awarded REAL DEFAULT 0,
      answered_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id)
    )
  `);

  // Proctoring violations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS violations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      metadata TEXT
    )
  `);

  // Add severity column if it doesn't exist (safe migration)
  try {
    db.exec(`ALTER TABLE violations ADD COLUMN severity TEXT DEFAULT 'MEDIUM' CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Add AI detection columns to violations (safe migration)
  try {
    db.exec(`ALTER TABLE violations ADD COLUMN confidence_score REAL DEFAULT 0`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Add metadata column for AI detection data (safe migration)
  try {
    db.exec(`ALTER TABLE violations ADD COLUMN metadata TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  try {
    db.exec(`ALTER TABLE violations ADD COLUMN snapshot_id TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Proctoring snapshots table (AI evidence images)
  // NOTE: Images are stored as files in data/proctoring-snapshots/ directory
  // Database only stores file paths and metadata
  db.exec(`
    CREATE TABLE IF NOT EXISTS proctoring_snapshots (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      violation_id TEXT,
      file_path TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      detection_type TEXT NOT NULL,
      confidence REAL NOT NULL,
      timestamp TEXT DEFAULT (datetime('now')),
      expires_at TEXT,
      FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (violation_id) REFERENCES violations(id) ON DELETE SET NULL
    )
  `);

  // Create indexes for snapshots
  db.exec(`CREATE INDEX IF NOT EXISTS idx_snapshots_session ON proctoring_snapshots(session_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_snapshots_violation ON proctoring_snapshots(violation_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_snapshots_detection ON proctoring_snapshots(detection_type)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_snapshots_expires ON proctoring_snapshots(expires_at)`);

  // Proctoring activity logs table (detailed tracking)
  db.exec(`
    CREATE TABLE IF NOT EXISTS proctoring_logs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_data TEXT,
      ip_address TEXT,
      user_agent TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      is_violation INTEGER DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE
    )
  `);

  // Create index for proctoring logs
  db.exec(`CREATE INDEX IF NOT EXISTS idx_proctoring_logs_session ON proctoring_logs(session_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_proctoring_logs_timestamp ON proctoring_logs(timestamp)`);

  // Attempt history table (for analytics)
  db.exec(`
    CREATE TABLE IF NOT EXISTS attempt_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      exam_id TEXT NOT NULL,
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

  // Create indexes for performance
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_exams_active ON exams(is_active)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_questions_exam ON questions(exam_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON exam_sessions(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_status ON exam_sessions(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_responses_session ON responses(session_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_violations_session ON violations(session_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_attempt_history_user ON attempt_history(user_id)`);

  // Add session_id column if it doesn't exist (safe migration for existing DBs)
  try {
    db.exec(`ALTER TABLE attempt_history ADD COLUMN session_id TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Add image columns to questions table if they don't exist
  const imageColumns = [
    'image_url',
    'option_a_image_url',
    'option_b_image_url',
    'option_c_image_url',
    'option_d_image_url',
    'explanation_image_url'
  ];

  for (const col of imageColumns) {
    try {
      db.exec(`ALTER TABLE questions ADD COLUMN ${col} TEXT`);
    } catch (e) {
      // Column already exists, ignore
    }
  }

  // Add question_type column if it doesn't exist (safe migration for existing DBs)
  try {
    db.exec(`ALTER TABLE questions ADD COLUMN question_type TEXT DEFAULT 'TEXT' CHECK(question_type IN ('TEXT', 'IMAGE'))`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Migration: Recreate questions table to allow NULL question_text and option fields
  // This is necessary because SQLite doesn't support ALTER COLUMN
  try {
    const tableInfo = db.prepare("PRAGMA table_info(questions)").all();
    const hasOldSchema = tableInfo.some(col => col.name === 'question_text' && col.notnull === 1);
    
    if (hasOldSchema) {
      console.log('Migrating questions table schema to support image-based questions...');
      
      // Temporarily disable foreign keys
      db.pragma('foreign_keys = OFF');
      
      // Drop the new table if it exists from a failed previous attempt
      try {
        db.exec(`DROP TABLE IF EXISTS questions_new`);
      } catch (e) {
        // Ignore
      }
      
      // Create new table with updated schema
      db.exec(`
        CREATE TABLE questions_new (
          id TEXT PRIMARY KEY,
          exam_id TEXT NOT NULL,
          question_type TEXT DEFAULT 'TEXT' CHECK(question_type IN ('TEXT', 'IMAGE')),
          question_text TEXT,
          option_a TEXT,
          option_b TEXT,
          option_c TEXT,
          option_d TEXT,
          correct_option TEXT NOT NULL CHECK(correct_option IN ('A', 'B', 'C', 'D')),
          marks INTEGER DEFAULT 1,
          negative_marks REAL DEFAULT 0,
          difficulty TEXT DEFAULT 'MEDIUM' CHECK(difficulty IN ('EASY', 'MEDIUM', 'HARD')),
          explanation TEXT,
          image_url TEXT,
          option_a_image_url TEXT,
          option_b_image_url TEXT,
          option_c_image_url TEXT,
          option_d_image_url TEXT,
          explanation_image_url TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
        )
      `);

      // Copy data from old table
      db.exec(`
        INSERT INTO questions_new 
        SELECT 
          id, exam_id, 
          COALESCE(question_type, 'TEXT') as question_type,
          question_text,
          option_a, option_b, option_c, option_d,
          correct_option, marks, negative_marks, difficulty, explanation,
          image_url, option_a_image_url, option_b_image_url, option_c_image_url, option_d_image_url, explanation_image_url,
          created_at
        FROM questions
      `);

      // Drop old table and rename new one
      db.exec(`DROP TABLE questions`);
      db.exec(`ALTER TABLE questions_new RENAME TO questions`);

      // Recreate indexes
      db.exec(`CREATE INDEX IF NOT EXISTS idx_questions_exam ON questions(exam_id)`);
      
      // Re-enable foreign keys
      db.pragma('foreign_keys = ON');
      
      console.log('✅ Questions table migration completed!');
    }
  } catch (e) {
    // Re-enable foreign keys on error
    try {
      db.pragma('foreign_keys = ON');
    } catch (err) {
      // Ignore
    }
    
    if (!e.message.includes('already exists') && !e.message.includes('duplicate column')) {
      console.error('Migration error:', e.message);
      // Don't fail - continue with existing schema
    }
  }

  console.log('Database initialized successfully');
};

// Initialize on load
initializeDatabase();

module.exports = db;
