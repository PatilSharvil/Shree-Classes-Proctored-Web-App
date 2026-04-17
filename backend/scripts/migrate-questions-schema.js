const { query } = require('../src/config/database');

/**
 * Migration script to update the questions table schema
 * - Adds question_type column
 * - Renames image columns to match codebase expectations
 */
async function runMigration() {
  try {
    console.log('🚀 Starting Database Migration...');

    // 1. Add question_type column if it doesn't exist
    try {
      await query(`
        ALTER TABLE questions 
        ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'TEXT' CHECK(question_type IN ('TEXT', 'IMAGE'))
      `);
      console.log('✅ Added question_type column');
    } catch (e) {
      console.log('ℹ️ question_type column already exists or skipped:', e.message);
    }

    // 2. Rename image columns to match new schema (_image -> _image_url)
    const renames = [
      ['question_image', 'image_url'],
      ['option_a_image', 'option_a_image_url'],
      ['option_b_image', 'option_b_image_url'],
      ['option_c_image', 'option_c_image_url'],
      ['option_d_image', 'option_d_image_url'],
      ['explanation_image', 'explanation_image_url']
    ];

    for (const [oldCol, newCol] of renames) {
      try {
        // We check if the old column exists first by attempting the rename
        // CockroachDB/Postgres will throw an error if the column doesn't exist
        await query(`ALTER TABLE questions RENAME COLUMN ${oldCol} TO ${newCol}`);
        console.log(`✅ Renamed ${oldCol} to ${newCol}`);
      } catch (e) {
        if (e.message.includes('does not exist')) {
          console.log(`ℹ️ Column ${oldCol} does not exist, skipping rename.`);
        } else {
          console.warn(`⚠️ Warning renaming ${oldCol}:`, e.message);
        }
      }
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
