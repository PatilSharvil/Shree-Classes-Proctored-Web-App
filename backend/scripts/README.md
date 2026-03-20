# Fake Data Management Guide

This guide explains how to manage fake/placeholder data in the Proctored Web App.

## Overview

The platform includes a data management script that helps you:
- **Identify** fake or placeholder data in the database
- **Export** data to backup JSON files
- **Clean** fake data while keeping required data (admin users)
- **Restore** data from backup files

## What Data is Considered "Fake"?

| Data Type | Required? | Reason |
|-----------|-----------|--------|
| Admin Users | ✅ Yes | System needs at least one admin |
| Student Users | ❌ No | Can be recreated as needed |
| Exams | ❌ No | Created by admin for real use |
| Questions | ❌ No | Associated with exams |
| Exam Sessions | ❌ No | Temporary exam data |
| Responses | ❌ No | Associated with sessions |
| Violations | ❌ No | Associated with sessions |
| Attempt History | ❌ No | Historical exam data |

## Location

- **Script**: `backend/scripts/manageFakeData.js`
- **Backup Directory**: `backend/data/backups/`
- **Database**: `backend/data/exam.db`

## Usage

### 1. Check Database Status

View current data counts and available backups:

```bash
cd backend
node scripts/manageFakeData.js status
```

### 2. Export Data (Without Deleting)

Create a backup of all data (both required and fake):

```bash
node scripts/manageFakeData.js export
```

This creates a timestamped JSON file in `backend/data/backups/`.

### 3. Clean Fake Data

Remove all fake data and create a backup automatically:

```bash
node scripts/manageFakeData.js clean
```

This will:
1. Export all data to a backup file
2. Delete all student users, exams, questions, sessions, responses, violations, and attempt history
3. Keep only admin users

### 4. Restore Data

Restore data from the most recent backup:

```bash
node scripts/manageFakeData.js restore
```

Or specify a specific backup file:

```bash
node scripts/manageFakeData.js restore fake-data-backup-2026-03-19T12-00-00.json
```

## Backup File Structure

Backup files are JSON formatted with the following structure:

```json
{
  "metadata": {
    "exportDate": "2026-03-19T12:00:00.000Z",
    "exportType": "full",
    "description": "Full database export including required and fake data"
  },
  "required": {
    "users": [...],
    "exams": [],
    "questions": [],
    "sessions": [],
    "responses": [],
    "violations": [],
    "attemptHistory": []
  },
  "fake": {
    "users": [...],
    "exams": [...],
    "questions": [...],
    "sessions": [...],
    "responses": [...],
    "violations": [...],
    "attemptHistory": [...]
  },
  "summary": {
    "totalRequired": 1,
    "totalFake": 50,
    "exportDate": "2026-03-19T12:00:00.000Z",
    "databasePath": "path/to/exam.db"
  }
}
```

## Examples

### Example 1: Clean Database Before Production Deployment

```bash
# Check current status
node scripts/manageFakeData.js status

# Clean all fake data (backup is created automatically)
node scripts/manageFakeData.js clean

# Verify cleanup
node scripts/manageFakeData.js status
```

### Example 2: Test Data Restoration

```bash
# Clean the database
node scripts/manageFakeData.js clean

# Restore from backup
node scripts/manageFakeData.js restore

# Verify restoration
node scripts/manageFakeData.js status
```

### Example 3: Export Before Major Changes

```bash
# Export current state before making changes
node scripts/manageFakeData.js export

# Make your changes...

# If something goes wrong, restore from backup
node scripts/manageFakeData.js restore
```

## Automated Cleanup (Optional)

You can add the cleanup script to your deployment pipeline:

```bash
# In your deployment script
cd backend
node scripts/manageFakeData.js clean
```

## Frontend Placeholder Data

The following frontend files contain placeholder text that may need updating:

| File | Placeholder | Suggested Update |
|------|-------------|------------------|
| `frontend/src/pages/dashboard/StudentDashboard.jsx` | "Welcome, Scholar!" | Use actual student name from session |
| `frontend/src/pages/dashboard/StudentDashboard.jsx` | "1,250" points | Remove or fetch from API |
| `frontend/src/pages/dashboard/StudentDashboard.jsx` | "Practice test for MHT CET preparation." | Use actual exam description |

### Fixing Frontend Placeholders

To remove hardcoded student name and points:

1. Open `frontend/src/pages/dashboard/StudentDashboard.jsx`
2. Replace hardcoded values with dynamic data from user context
3. Remove the points display if not implemented in backend

## Troubleshooting

### Database Locked Error

If you get a "database is locked" error:
1. Stop the backend server
2. Run the script
3. Restart the backend server

### No Backup Files Found

Ensure backups exist in `backend/data/backups/`:
```bash
ls backend/data/backups/
```

### Restore Fails with Foreign Key Errors

The restore process respects foreign key constraints. Data is restored in the correct order:
1. Users first
2. Then exams
3. Then questions
4. Then sessions, responses, violations, and attempt history

## Best Practices

1. **Always backup before cleaning** - The `clean` command does this automatically
2. **Test restoration** - Periodically verify backups can be restored
3. **Keep multiple backups** - Don't delete old backup files immediately
4. **Document changes** - Note when and why you cleaned data
5. **Verify after cleanup** - Always run `status` after cleanup to confirm

## Security Notes

- Backup files contain hashed passwords - store them securely
- Don't commit backup files to version control (they're in `.gitignore`)
- Consider encrypting backups if they contain sensitive data

## Support

For issues or questions, check the application logs in `backend/logs/` or contact the development team.
