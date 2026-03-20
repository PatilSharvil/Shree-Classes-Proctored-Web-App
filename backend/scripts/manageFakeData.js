/**
 * Fake Data Management Script
 * 
 * This script identifies, exports, and removes fake/placeholder data from the database.
 * It keeps only required data (admin user) and stores removed data in a backup file.
 * 
 * Usage:
 *   node scripts/manageFakeData.js export    - Export all data to backup file
 *   node scripts/manageFakeData.js clean      - Remove fake data and create backup
 *   node scripts/manageFakeData.js restore    - Restore data from backup file
 *   node scripts/manageFakeData.js status     - Show current database status
 */

const db = require('../src/config/database');
const fs = require('fs');
const path = require('path');

// Configuration
const BACKUP_DIR = path.join(__dirname, '../data/backups');
const BACKUP_FILE_PREFIX = 'fake-data-backup';

// Ensure backup directory exists
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`Created backup directory: ${BACKUP_DIR}`);
  }
}

// Get timestamp for backup filename
function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

/**
 * Identify fake/placeholder data
 * Returns object with all data categorized as required or fake
 */
function identifyData() {
  console.log('\n📊 Analyzing database content...\n');
  
  const data = {
    required: {},
    fake: {},
    summary: {}
  };
  
  // ============ USERS ============
  const allUsers = db.prepare('SELECT * FROM users ORDER BY created_at').all();
  const adminUsers = allUsers.filter(u => u.role === 'ADMIN');
  const studentUsers = allUsers.filter(u => u.role === 'STUDENT');
  
  data.required.users = adminUsers; // Keep all admins
  data.fake.users = studentUsers;   // Mark students as removable (fake data)
  
  console.log(`👥 Users:`);
  console.log(`   - Admin users (required): ${adminUsers.length}`);
  console.log(`   - Student users (removable): ${studentUsers.length}`);
  
  // ============ EXAMS ============
  let allExams = [];
  try {
    allExams = db.prepare('SELECT * FROM exams ORDER BY created_at').all();
  } catch (e) {
    console.log('   (Could not fetch exams - table may not exist)');
  }
  
  // All exams are considered fake/placeholder unless created by admin for real use
  data.fake.exams = allExams;
  data.required.exams = [];
  
  console.log(`📝 Exams:`);
  console.log(`   - Required exams: 0`);
  console.log(`   - Exams (removable): ${allExams.length}`);
  
  // ============ QUESTIONS ============
  let allQuestions = [];
  try {
    allQuestions = db.prepare('SELECT * FROM questions ORDER BY created_at').all();
  } catch (e) {
    console.log('   (Could not fetch questions - table may not exist)');
  }
  
  data.fake.questions = allQuestions;
  data.required.questions = [];
  
  console.log(`❓ Questions:`);
  console.log(`   - Required questions: 0`);
  console.log(`   - Questions (removable): ${allQuestions.length}`);
  
  // ============ EXAM SESSIONS ============
  let allSessions = [];
  try {
    allSessions = db.prepare('SELECT * FROM exam_sessions ORDER BY created_at').all();
  } catch (e) {
    console.log('   (Could not fetch sessions - table may not exist)');
  }
  
  data.fake.sessions = allSessions;
  data.required.sessions = [];
  
  console.log(`📋 Exam Sessions:`);
  console.log(`   - Required sessions: 0`);
  console.log(`   - Sessions (removable): ${allSessions.length}`);
  
  // ============ RESPONSES ============
  let allResponses = [];
  try {
    allResponses = db.prepare('SELECT * FROM responses ORDER BY created_at').all();
  } catch (e) {
    console.log('   (Could not fetch responses - table may not exist)');
  }
  
  data.fake.responses = allResponses;
  data.required.responses = [];
  
  console.log(`✅ Responses:`);
  console.log(`   - Required responses: 0`);
  console.log(`   - Responses (removable): ${allResponses.length}`);
  
  // ============ VIOLATIONS ============
  let allViolations = [];
  try {
    allViolations = db.prepare('SELECT * FROM violations ORDER BY created_at').all();
  } catch (e) {
    console.log('   (Could not fetch violations - table may not exist)');
  }
  
  data.fake.violations = allViolations;
  data.required.violations = [];
  
  console.log(`⚠️  Violations:`);
  console.log(`   - Required violations: 0`);
  console.log(`   - Violations (removable): ${allViolations.length}`);
  
  // ============ ATTEMPT HISTORY ============
  let allAttempts = [];
  try {
    allAttempts = db.prepare('SELECT * FROM attempt_history ORDER BY created_at').all();
  } catch (e) {
    console.log('   (Could not fetch attempt history - table may not exist)');
  }
  
  data.fake.attemptHistory = allAttempts;
  data.required.attemptHistory = [];
  
  console.log(`📜 Attempt History:`);
  console.log(`   - Required attempts: 0`);
  console.log(`   - Attempts (removable): ${allAttempts.length}`);
  
  // Summary
  data.summary = {
    totalRequired: adminUsers.length,
    totalFake: studentUsers.length + allExams.length + allQuestions.length + 
               allSessions.length + allResponses.length + allViolations.length + allAttempts.length,
    exportDate: new Date().toISOString(),
    databasePath: db.name
  };
  
  console.log(`\n📊 Summary:`);
  console.log(`   - Total required records: ${data.summary.totalRequired}`);
  console.log(`   - Total removable records: ${data.summary.totalFake}`);
  
  return data;
}

/**
 * Export all data to backup file
 */
function exportData() {
  ensureBackupDir();
  
  const data = identifyData();
  
  // Include both required and fake data in export
  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      exportType: 'full',
      description: 'Full database export including required and fake data'
    },
    required: data.required,
    fake: data.fake,
    summary: data.summary
  };
  
  const backupPath = path.join(BACKUP_DIR, `${BACKUP_FILE_PREFIX}-${getTimestamp()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(exportData, null, 2));
  
  console.log(`\n✅ Data exported to: ${backupPath}`);
  return { backupPath, data };
}

/**
 * Clean fake data from database
 */
function cleanFakeData() {
  console.log('\n🧹 Starting fake data cleanup...\n');
  
  ensureBackupDir();
  
  // First, export all data
  const { backupPath } = exportData();
  
  console.log('\n🗑️  Removing fake data from database...\n');
  
  const stats = {
    deleted: {},
    errors: []
  };
  
  try {
    // Enable foreign keys
    db.exec('PRAGMA foreign_keys = ON');
    
    // Delete in order to respect foreign key constraints
    
    // 1. Delete violations (references sessions)
    const violationsCount = db.prepare('DELETE FROM violations').run().changes;
    stats.deleted.violations = violationsCount;
    console.log(`   ❌ Deleted ${violationsCount} violations`);
    
    // 2. Delete responses (references sessions and questions)
    const responsesCount = db.prepare('DELETE FROM responses').run().changes;
    stats.deleted.responses = responsesCount;
    console.log(`   ❌ Deleted ${responsesCount} responses`);
    
    // 3. Delete exam sessions (references users and exams)
    const sessionsCount = db.prepare('DELETE FROM exam_sessions').run().changes;
    stats.deleted.sessions = sessionsCount;
    console.log(`   ❌ Deleted ${sessionsCount} exam sessions`);
    
    // 4. Delete attempt history (references users and exams)
    const attemptsCount = db.prepare('DELETE FROM attempt_history').run().changes;
    stats.deleted.attemptHistory = attemptsCount;
    console.log(`   ❌ Deleted ${attemptsCount} attempt history records`);
    
    // 5. Delete questions (references exams)
    const questionsCount = db.prepare('DELETE FROM questions').run().changes;
    stats.deleted.questions = questionsCount;
    console.log(`   ❌ Deleted ${questionsCount} questions`);
    
    // 6. Delete exams
    const examsCount = db.prepare('DELETE FROM exams').run().changes;
    stats.deleted.exams = examsCount;
    console.log(`   ❌ Deleted ${examsCount} exams`);
    
    // 7. Delete student users (keep admins)
    const studentsCount = db.prepare("DELETE FROM users WHERE role = 'STUDENT'").run().changes;
    stats.deleted.students = studentsCount;
    console.log(`   ❌ Deleted ${studentsCount} student users`);
    
    stats.totalDeleted = Object.values(stats.deleted).reduce((a, b) => a + b, 0);
    
    console.log(`\n✅ Cleanup completed!`);
    console.log(`   📦 Backup saved to: ${backupPath}`);
    console.log(`   🗑️  Total records deleted: ${stats.totalDeleted}`);
    
    return { backupPath, stats };
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    stats.errors.push(error.message);
    return { backupPath, stats, error };
  }
}

/**
 * Restore data from backup file
 */
function restoreData(backupFile) {
  console.log('\n♻️  Restoring data from backup...\n');
  
  let backupPath;
  if (backupFile) {
    backupPath = path.isAbsolute(backupFile) ? backupFile : path.join(BACKUP_DIR, backupFile);
  } else {
    // Find most recent backup
    if (!fs.existsSync(BACKUP_DIR)) {
      console.error('❌ No backup directory found');
      return;
    }
    
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith(BACKUP_FILE_PREFIX) && f.endsWith('.json'))
      .sort()
      .reverse();
    
    if (backups.length === 0) {
      console.error('❌ No backup files found');
      return;
    }
    
    backupPath = path.join(BACKUP_DIR, backups[0]);
    console.log(`Using most recent backup: ${backups[0]}`);
  }
  
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Backup file not found: ${backupPath}`);
    return;
  }
  
  try {
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log(`\n📦 Restoring from: ${backupPath}`);
    console.log(`   Export date: ${backupData.metadata?.exportDate || 'Unknown'}`);
    
    const stats = {
      restored: {},
      errors: []
    };
    
    db.exec('PRAGMA foreign_keys = ON');
    
    // Restore users (both admin and student)
    if (backupData.required?.users) {
      for (const user of backupData.required.users) {
        try {
          db.prepare(`
            INSERT OR IGNORE INTO users (id, email, password, name, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(user.id, user.email, user.password, user.name, user.role, user.created_at, user.updated_at);
        } catch (e) {
          stats.errors.push(`User ${user.email}: ${e.message}`);
        }
      }
      stats.restored.users = backupData.required.users.length;
    }
    
    if (backupData.fake?.users) {
      for (const user of backupData.fake.users) {
        try {
          db.prepare(`
            INSERT OR IGNORE INTO users (id, email, password, name, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(user.id, user.email, user.password, user.name, user.role, user.created_at, user.updated_at);
        } catch (e) {
          stats.errors.push(`User ${user.email}: ${e.message}`);
        }
      }
      stats.restored.students = backupData.fake.users.length;
    }
    
    // Restore exams
    if (backupData.fake?.exams) {
      for (const exam of backupData.fake.exams) {
        try {
          db.prepare(`
            INSERT OR IGNORE INTO exams (
              id, title, description, subject, duration_minutes, total_marks, 
              negative_marks, passing_percentage, scheduled_start, scheduled_end, 
              is_active, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            exam.id, exam.title, exam.description, exam.subject, exam.duration_minutes, 
            exam.total_marks, exam.negative_marks, exam.passing_percentage, 
            exam.scheduled_start, exam.scheduled_end, exam.is_active, exam.created_by, 
            exam.created_at, exam.updated_at
          );
        } catch (e) {
          stats.errors.push(`Exam ${exam.title}: ${e.message}`);
        }
      }
      stats.restored.exams = backupData.fake.exams.length;
    }
    
    // Restore questions
    if (backupData.fake?.questions) {
      for (const question of backupData.fake.questions) {
        try {
          db.prepare(`
            INSERT OR IGNORE INTO questions (
              id, exam_id, question_text, option_a, option_b, option_c, option_d,
              correct_option, marks, negative_marks, difficulty, explanation, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            question.id, question.exam_id, question.question_text, question.option_a,
            question.option_b, question.option_c, question.option_d, question.correct_option,
            question.marks, question.negative_marks, question.difficulty, question.explanation,
            question.created_at
          );
        } catch (e) {
          stats.errors.push(`Question ${question.id}: ${e.message}`);
        }
      }
      stats.restored.questions = backupData.fake.questions.length;
    }
    
    // Restore sessions
    if (backupData.fake?.sessions) {
      for (const session of backupData.fake.sessions) {
        try {
          db.prepare(`
            INSERT OR IGNORE INTO exam_sessions (
              id, user_id, exam_id, started_at, submitted_at, status, 
              current_question_index, total_questions, score, attempted_count, 
              correct_count, violation_count, last_activity_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            session.id, session.user_id, session.exam_id, session.started_at, 
            session.submitted_at, session.status, session.current_question_index, 
            session.total_questions, session.score, session.attempted_count, 
            session.correct_count, session.violation_count, session.last_activity_at
          );
        } catch (e) {
          stats.errors.push(`Session ${session.id}: ${e.message}`);
        }
      }
      stats.restored.sessions = backupData.fake.sessions.length;
    }
    
    // Restore responses
    if (backupData.fake?.responses) {
      for (const response of backupData.fake.responses) {
        try {
          db.prepare(`
            INSERT OR IGNORE INTO responses (id, session_id, question_id, selected_option, is_correct, marks_awarded, answered_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            response.id, response.session_id, response.question_id, 
            response.selected_option, response.is_correct, response.marks_awarded, response.answered_at
          );
        } catch (e) {
          stats.errors.push(`Response ${response.id}: ${e.message}`);
        }
      }
      stats.restored.responses = backupData.fake.responses.length;
    }
    
    // Restore violations
    if (backupData.fake?.violations) {
      for (const violation of backupData.fake.violations) {
        try {
          db.prepare(`
            INSERT OR IGNORE INTO violations (id, session_id, type, description, timestamp)
            VALUES (?, ?, ?, ?, ?)
          `).run(
            violation.id, violation.session_id, violation.type, violation.description, violation.timestamp
          );
        } catch (e) {
          stats.errors.push(`Violation ${violation.id}: ${e.message}`);
        }
      }
      stats.restored.violations = backupData.fake.violations.length;
    }
    
    // Restore attempt history
    if (backupData.fake?.attemptHistory) {
      for (const attempt of backupData.fake.attemptHistory) {
        try {
          db.prepare(`
            INSERT OR IGNORE INTO attempt_history (
              id, user_id, exam_id, score, total_marks, percentage, 
              correct_count, incorrect_count, unattempted_count, duration_taken, 
              started_at, submitted_at, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            attempt.id, attempt.user_id, attempt.exam_id, attempt.score, attempt.total_marks,
            attempt.percentage, attempt.correct_count, attempt.incorrect_count, 
            attempt.unattempted_count, attempt.duration_taken, attempt.started_at, 
            attempt.submitted_at, attempt.status
          );
        } catch (e) {
          stats.errors.push(`Attempt ${attempt.id}: ${e.message}`);
        }
      }
      stats.restored.attemptHistory = backupData.fake.attemptHistory.length;
    }
    
    stats.totalRestored = Object.values(stats.restored).reduce((a, b) => a + b, 0);
    
    console.log(`\n✅ Restoration completed!`);
    console.log(`   ♻️  Total records restored: ${stats.totalRestored}`);
    
    if (stats.errors.length > 0) {
      console.log(`   ⚠️  ${stats.errors.length} errors occurred:`);
      stats.errors.slice(0, 5).forEach(e => console.log(`      - ${e}`));
      if (stats.errors.length > 5) console.log(`      ... and ${stats.errors.length - 5} more`);
    }
    
    return stats;
    
  } catch (error) {
    console.error('❌ Error during restoration:', error.message);
    return { error: error.message };
  }
}

/**
 * Show database status
 */
function showStatus() {
  console.log('\n📊 Current Database Status\n');
  console.log('═'.repeat(50));
  
  const tables = [
    { name: 'users (ADMIN)', query: "SELECT COUNT(*) as count FROM users WHERE role = 'ADMIN'" },
    { name: 'users (STUDENT)', query: "SELECT COUNT(*) as count FROM users WHERE role = 'STUDENT'" },
    { name: 'exams', query: 'SELECT COUNT(*) as count FROM exams' },
    { name: 'questions', query: 'SELECT COUNT(*) as count FROM questions' },
    { name: 'exam_sessions', query: 'SELECT COUNT(*) as count FROM exam_sessions' },
    { name: 'responses', query: 'SELECT COUNT(*) as count FROM responses' },
    { name: 'violations', query: 'SELECT COUNT(*) as count FROM violations' },
    { name: 'attempt_history', query: 'SELECT COUNT(*) as count FROM attempt_history' }
  ];
  
  for (const table of tables) {
    const result = db.prepare(table.query).get();
    console.log(`${table.name.padEnd(20)} : ${result.count}`);
  }
  
  console.log('═'.repeat(50));
  
  // Check for backup files
  if (fs.existsSync(BACKUP_DIR)) {
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith(BACKUP_FILE_PREFIX) && f.endsWith('.json'))
      .sort()
      .reverse();
    
    console.log(`\n📦 Available Backups (${backups.length}):`);
    backups.slice(0, 5).forEach(b => {
      const filePath = path.join(BACKUP_DIR, b);
      const stats = fs.statSync(filePath);
      console.log(`   - ${b} (${(stats.size / 1024).toFixed(2)} KB)`);
    });
  } else {
    console.log('\n📦 No backup directory found');
  }
  
  console.log();
}

// Main execution
function main() {
  const command = process.argv[2];
  
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║         Fake Data Management Tool                        ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  switch (command) {
    case 'export':
      exportData();
      break;
      
    case 'clean':
      cleanFakeData();
      break;
      
    case 'restore':
      const backupFile = process.argv[3];
      restoreData(backupFile);
      break;
      
    case 'status':
    default:
      showStatus();
      break;
  }
  
  // Close database connection
  db.close();
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  identifyData,
  exportData,
  cleanFakeData,
  restoreData,
  showStatus
};
