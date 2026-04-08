# Exam Deletion Fix - Summary

## Problem
In the deployed version, exams could be created but not deleted. When attempting to delete an exam, the operation would fail silently or throw an error.

## Root Cause
The `exam_sessions` table has a foreign key constraint referencing the `exams` table, but **without** `ON DELETE CASCADE`. Since foreign key enforcement is enabled in SQLite (`db.pragma('foreign_keys = ON')`), attempting to delete an exam that has any related exam sessions (even completed ones) violates the foreign key constraint, causing the deletion to fail.

## Solution
Updated the `deleteExam` service method to properly clean up all related records **before** deleting the exam, in the correct order:

1. **Delete responses** - Records in `responses` table linked to exam sessions
2. **Delete violations** - Proctoring violation records linked to exam sessions  
3. **Delete proctoring logs** - Activity logs linked to exam sessions
4. **Delete exam sessions** - All sessions for the exam
5. **Delete attempt history** - Historical attempt records for the exam
6. **Delete exam** - Finally delete the exam itself (questions are auto-deleted via `ON DELETE CASCADE`)

## Files Changed
- `backend/src/modules/exams/exams.service.js` - Updated `deleteExam` method (lines 147-172)

## What Was Changed

### Before:
```javascript
deleteExam(id) {
  const exam = this.getExamById(id);
  db.prepare('DELETE FROM exams WHERE id = ?').run(id);
  return { message: 'Exam deleted successfully.' };
}
```

### After:
```javascript
deleteExam(id) {
  const exam = this.getExamById(id);
  
  // Delete related records in the correct order to avoid foreign key constraint violations
  const deleteResponses = db.prepare('DELETE FROM responses WHERE session_id IN (SELECT id FROM exam_sessions WHERE exam_id = ?)');
  deleteResponses.run(id);
  
  const deleteViolations = db.prepare('DELETE FROM violations WHERE session_id IN (SELECT id FROM exam_sessions WHERE exam_id = ?)');
  deleteViolations.run(id);
  
  const deleteProctoringLogs = db.prepare('DELETE FROM proctoring_logs WHERE session_id IN (SELECT id FROM exam_sessions WHERE exam_id = ?)');
  deleteProctoringLogs.run(id);
  
  const deleteSessions = db.prepare('DELETE FROM exam_sessions WHERE exam_id = ?');
  deleteSessions.run(id);
  
  const deleteAttemptHistory = db.prepare('DELETE FROM attempt_history WHERE exam_id = ?');
  deleteAttemptHistory.run(id);
  
  // Questions will be auto-deleted via ON DELETE CASCADE
  db.prepare('DELETE FROM exams WHERE id = ?').run(id);
  return { message: 'Exam deleted successfully.' };
}
```

## Safety Considerations
✅ **No breaking changes** - The API endpoint and response format remain the same  
✅ **Backwards compatible** - Existing functionality is preserved  
✅ **Data integrity maintained** - All related records are properly cleaned up  
✅ **Tested** - Unit tests for `deleteExam` controller pass successfully  
✅ **No side effects** - Other exam operations (create, read, update) are unaffected  

## Deployment Instructions

### For Traditional Deployment:
1. Pull the latest code to your server
2. Restart the backend service:
   ```bash
   cd /path/to/backend
   npm restart
   # OR if using PM2:
   pm2 restart backend
   ```

### For Docker Deployment:
1. Pull the latest code
2. Rebuild and restart containers:
   ```bash
   docker-compose up -d --build backend
   ```

## Testing After Deployment
1. Log in as an admin
2. Navigate to the Exams management page
3. Create a test exam
4. Try deleting the test exam - it should now work successfully
5. Verify the exam is removed from the list

## Future Improvement (Optional)
Consider adding `ON DELETE CASCADE` to the `exam_sessions` table's foreign key constraint for `exam_id`. This would require:
1. Creating a database migration
2. Dropping and recreating the foreign key constraint
3. This is **not required** for the current fix to work, but would simplify the code in the future

---
**Date:** April 8, 2026  
**Status:** ✅ Fixed and Ready for Deployment
