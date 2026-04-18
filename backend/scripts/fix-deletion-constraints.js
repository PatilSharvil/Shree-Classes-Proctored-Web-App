const { query } = require('../src/config/database');

/**
 * Migration script to update foreign key constraints
 * Adds ON DELETE CASCADE to allow deleting students with history
 */
async function runMigration() {
  try {
    console.log('🚀 Starting Student Deletion Fix Migration...');

    // 1. exam_sessions -> users
    try {
      await query('ALTER TABLE exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_user_id_fkey');
      await query('ALTER TABLE exam_sessions ADD CONSTRAINT exam_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
      console.log('✅ Updated exam_sessions_user_id_fkey');
    } catch (e) { console.warn('⚠️ Error updating exam_sessions_user_id_fkey:', e.message); }

    // 2. exam_sessions -> exams
    try {
      await query('ALTER TABLE exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_exam_id_fkey');
      await query('ALTER TABLE exam_sessions ADD CONSTRAINT exam_sessions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE');
      console.log('✅ Updated exam_sessions_exam_id_fkey');
    } catch (e) { console.warn('⚠️ Error updating exam_sessions_exam_id_fkey:', e.message); }

    // 3. attempt_history -> users
    try {
      await query('ALTER TABLE attempt_history DROP CONSTRAINT IF EXISTS attempt_history_user_id_fkey');
      await query('ALTER TABLE attempt_history ADD CONSTRAINT attempt_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
      console.log('✅ Updated attempt_history_user_id_fkey');
    } catch (e) { console.warn('⚠️ Error updating attempt_history_user_id_fkey:', e.message); }

    // 4. attempt_history -> exams
    try {
      await query('ALTER TABLE attempt_history DROP CONSTRAINT IF EXISTS attempt_history_exam_id_fkey');
      await query('ALTER TABLE attempt_history ADD CONSTRAINT attempt_history_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE');
      console.log('✅ Updated attempt_history_exam_id_fkey');
    } catch (e) { console.warn('⚠️ Error updating attempt_history_exam_id_fkey:', e.message); }

    // 5. responses -> questions
    try {
      await query('ALTER TABLE responses DROP CONSTRAINT IF EXISTS responses_question_id_fkey');
      await query('ALTER TABLE responses ADD CONSTRAINT responses_question_id_fkey FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE');
      console.log('✅ Updated responses_question_id_fkey');
    } catch (e) { console.warn('⚠️ Error updating responses_question_id_fkey:', e.message); }

    // 6. exams -> users (created_by)
    try {
      await query('ALTER TABLE exams DROP CONSTRAINT IF EXISTS exams_created_by_fkey');
      await query('ALTER TABLE exams ADD CONSTRAINT exams_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL');
      console.log('✅ Updated exams_created_by_fkey');
    } catch (e) { console.warn('⚠️ Error updating exams_created_by_fkey:', e.message); }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
