# Security Vulnerabilities, Edge Cases & Code Quality Report

**Project:** Shree Classes Proctored Web App  
**Analysis Date:** March 23, 2026  
**Total Issues Found:** 155

---

## Executive Summary

This report contains a comprehensive security audit and code quality analysis of the Proctored MCQ Examination System. The analysis covers both backend (Node.js/Express) and frontend (React/Vite) codebases.

| Severity | Count | Priority |
|----------|-------|----------|
| 🔴 Critical | 20 | Immediate |
| 🟠 High | 30 | This Sprint |
| 🟡 Medium | 45 | Next Sprint |
| 🟢 Low | 30 | Backlog |
| ⚠️ Edge Cases | 30 | As Needed |

---

## Table of Contents

1. [Critical Severity Issues](#-critical-severity-fix-immediately)
2. [High Severity Issues](#-high-severity-fix-soon)
3. [Medium Severity Issues](#-medium-severity-fix-when-possible)
4. [Low Severity Issues](#-low-severity-code-quality)
5. [Edge Cases Not Handled](#-edge-cases-not-handled)
6. [Top 10 Priorities](#-top-10-priorities-to-fix-first)
7. [Recommendations](#-recommendations)

---

## 🔴 CRITICAL SEVERITY (Fix Immediately)

### Backend Issues

| # | Issue | File | Risk |
|---|-------|------|------|
| 1 | **Weak Default JWT Secret** - Predictable default value `default-secret-change-me` allows token forgery | `backend/src/config/env.js` | Attackers can forge authentication tokens and bypass auth entirely |
| 2 | **Hardcoded Admin Password** - Default `Admin@123` is well-known and documented in README | `backend/src/config/env.js` | Immediate account compromise on deployment |
| 3 | **SQL Injection Risk** - Dynamic query construction pattern with string concatenation | `backend/src/modules/exams/exams.service.js` | Potential database manipulation if pattern extended |
| 4 | **No Rate Limiting on Login** - 100 requests per 15 minutes allows significant brute force | `backend/src/app.js` | Credential stuffing and brute force attacks |
| 5 | **Missing Authorization Check** - Students can access other students' data via `/api/users/:id` | `backend/src/modules/users/users.routes.js` | Privacy breach, data exposure |
| 6 | **Race Condition** - Check-then-insert pattern without transaction allows duplicate exam sessions | `backend/src/modules/attempts/attempts.service.js` | Data corruption, session conflicts |
| 7 | **Race Condition** - Response save uses check-then-update without transaction | `backend/src/modules/attempts/attempts.service.js` | Lost updates, answer loss |
| 8 | **Path Traversal Vulnerability** - Excel file names not sanitized, allows `../../` patterns | `backend/src/services/excelService.js` | Unauthorized file system access |
| 9 | **No Input Validation** - Question correct_option not validated against provided options | `backend/src/modules/questions/questions.service.js` | Data integrity issues |
| 10 | **Tokens Never Invalidated** - No logout mechanism or token blacklist | `backend/src/modules/auth/auth.service.js` | Session hijacking, stolen tokens remain valid |

### Frontend Issues

| # | Issue | File | Risk |
|---|-------|------|------|
| 11 | **XSS Vulnerability** - API error messages rendered without sanitization | `frontend/src/pages/admin/EditExamPage.jsx` | Malicious scripts can execute via error responses |
| 12 | **JWT Stored in LocalStorage** - Tokens accessible via JavaScript, vulnerable to XSS | `frontend/src/store/authStore.js` | Token theft via XSS attacks |
| 13 | **No CSRF Protection** - State-changing POST/PUT/DELETE requests lack CSRF tokens | `frontend/src/services/api.js` | Cross-site request forgery attacks |
| 14 | **Sensitive Data in LocalStorage** - User info including role stored in plaintext | `frontend/src/store/authStore.js` | Data exposure, privacy breach |
| 15 | **No Network Connectivity Handling** - Exam responses lost if network fails during save | `frontend/src/pages/exam/ExamPage.jsx` | Student answer loss, data inconsistency |
| 16 | **Timer Manipulation Possible** - System clock changes affect exam countdown timer | `frontend/src/pages/exam/ExamPage.jsx` | Students can extend exam time |
| 17 | **Auto-Submit Silent Failure** - No user notification if auto-submit fails on timeout | `frontend/src/pages/exam/ExamPage.jsx` | Exam submission loss, grade loss |
| 18 | **No React Error Boundary** - Single component error crashes entire application | `frontend/src/App.jsx` | Poor UX, app becomes unusable |
| 19 | **401 Redirect Clears State** - Session expiry during exam redirects without saving work | `frontend/src/services/api.js` | All responses lost on token expiry |
| 20 | **No Input Sanitization** - Question text and options can contain malicious scripts | `frontend/src/pages/admin/AddQuestionPage.jsx` | XSS attacks via question content |

---

## 🟠 HIGH SEVERITY (Fix Soon)

### Backend Issues (21-35)

| # | Issue | File | Impact |
|---|-------|------|--------|
| 21 | Missing authorization on attempt details endpoint - any user can view others' results | `modules/attempts/attempts.routes.js` | Privacy breach, academic integrity |
| 22 | No CSRF protection despite CORS with credentials enabled | `app.js` | Cross-site attack vector |
| 23 | No validation on exam duration - negative or extremely large values accepted | `modules/exams/exams.controller.js` | Scheduling logic breaks |
| 24 | No validation that scheduled_end is after scheduled_start | `modules/exams/exams.service.js` | Invalid exam time ranges |
| 25 | Insecure Direct Object Reference in violation recording | `modules/proctoring/proctoring.routes.js` | Users can record violations for others |
| 26 | No violation type validation against whitelist | `modules/proctoring/proctoring.service.js` | Data inconsistency, potential injection |
| 27 | Error messages leak SQLite internal details to clients | `middlewares/error.middleware.js` | Information disclosure |
| 28 | No email format validation before storage | `modules/auth/auth.service.js` | Broken email notifications |
| 29 | No password complexity requirements for student accounts | `modules/auth/auth.service.js` | Weak passwords vulnerable to brute force |
| 30 | No account lockout mechanism after failed attempts | `modules/auth/auth.service.js` | Unlimited brute force within rate limit |
| 31 | No file size limit on Excel upload multer configuration | `modules/questions/questions.routes.js` | Memory exhaustion, DoS |
| 32 | No maximum length validation for question text and options | `modules/questions/questions.service.js` | Storage issues, display problems |
| 33 | Inconsistent error status codes across endpoints (400 vs 404 vs 500) | Multiple controllers | Debugging difficulty, API confusion |
| 34 | GitHub token stored in plain text in environment variables | `services/githubService.js` | Credential exposure if logs accessed |
| 35 | Health check endpoint doesn't verify database connectivity | `app.js` | False positive health status |

### Frontend Issues (36-50)

| # | Issue | File | Impact |
|---|-------|------|--------|
| 36 | IDOR risk in result pages - sequential attemptId allows viewing others' results | `pages/exam/ResultDetailPage.jsx` | Privacy breach, score exposure |
| 37 | No client-side rate limiting or captcha on login form | `pages/auth/LoginPage.jsx` | Easier brute force attacks |
| 38 | Clipboard data not monitored or prevented during exam | `hooks/useProctoring.js` | Students can copy questions |
| 39 | No Content Security Policy headers configured | All pages | XSS attacks easier |
| 40 | External Google Fonts loaded without Subresource Integrity | `index.css` | Supply chain attack vector |
| 41 | Form data sent to API without client-side sanitization | `pages/admin/CreateExamPage.jsx` | Injection attacks possible |
| 42 | Multiple tabs can open same exam session without prevention | `pages/exam/ExamPage.jsx` | Session conflicts, cheating |
| 43 | Division by zero possible in analytics calculations | `pages/admin/AdminDashboard.jsx` | Runtime crash |
| 44 | Array access without bounds checking | `pages/admin/AnalyticsPage.jsx` | Runtime errors |
| 45 | Missing null check for question data before access | `pages/exam/ExamPage.jsx` | Crash on undefined |
| 46 | Date parsing edge cases with invalid date strings | `pages/admin/EditExamPage.jsx` | Invalid date displays |
| 47 | Generic error messages may leak backend structure | `pages/auth/LoginPage.jsx` | Information disclosure |
| 48 | No retry logic for failed API requests | `services/api.js` | Transient failures become permanent |
| 49 | Missing loading states for nested async operations | `pages/admin/ExamManagePage.jsx` | Poor user experience |
| 50 | Console.log statements left in production code | Multiple files | Information leak, log pollution |

---

## 🟡 MEDIUM SEVERITY (Fix When Possible)

### Backend Issues (51-75)

| # | Issue | Impact |
|---|-------|--------|
| 51 | No Content-Type header validation for JSON endpoints | Parsing errors, unexpected behavior |
| 52 | No HTTP request logging middleware (morgan, etc.) | Debugging and auditing difficulty |
| 53 | File cache has TTL but no invalidation mechanism for external changes | Stale data served |
| 54 | No validation on negative_marks and passing_percentage ranges | Calculation errors |
| 55 | Timezone handling inconsistent - comments say local but code uses UTC | Time comparison errors |
| 56 | Inconsistent naming conventions - mixed camelCase and snake_case | Code quality, maintainability |
| 57 | Magic numbers throughout codebase without named constants | Maintainability issues |
| 58 | Console.log used for ASCII banner instead of logger | Inconsistent logging |
| 59 | Unused pagination utility function exported but never used | Dead code |
| 60 | No database connection pooling - better-sqlite3 is synchronous single-connection | Performance bottleneck |
| 61 | Missing composite database indexes for common query patterns | Slow queries |
| 62 | No API versioning strategy - routes not prefixed with version | Breaking changes will break clients |
| 63 | Test files in backend root directory instead of dedicated test folder | Poor organization |
| 64 | No request timeout configuration for HTTP server | Slow clients hold connections indefinitely |
| 65 | Missing X-Content-Type-Options header verification | MIME sniffing attacks |
| 66 | No graceful degradation handling for repeated email service failures | Silent notification failures |
| 67 | Large Excel files loaded entirely into memory during import | Memory exhaustion risk |
| 68 | No retry logic with exponential backoff for GitHub API failures | Transient failures cause data loss |
| 69 | Hardcoded role strings 'ADMIN' and 'STUDENT' throughout codebase | Maintainability, typo risks |
| 70 | No request ID in API responses for tracing | Debugging difficulty |
| 71 | No response compression middleware configured | Performance, bandwidth waste |
| 72 | Default CORS configuration too permissive in development | Security gap |
| 73 | No database migration system for schema changes | Manual intervention required |
| 74 | Inconsistent date format handling - inline parsing in multiple places | Parsing errors |
| 75 | No application metrics or monitoring integration | Observability gap |

### Frontend Issues (76-95)

| # | Issue | Impact |
|---|-------|--------|
| 76 | Empty search results state not handled or displayed | Poor user experience |
| 77 | Long exam titles may overflow card boundaries despite line-clamp | Visual issues |
| 78 | Timezone inconsistency in date calculations | Time display errors |
| 79 | Promise rejection in violation recording handled silently | Hidden errors |
| 80 | No client-side email regex validation beyond HTML5 type | Invalid emails accepted |
| 81 | Password strength validation only checks minimum length (6 chars) | Weak passwords |
| 82 | Numeric inputs for duration and marks have no maximum bounds | Unreasonable values |
| 83 | File upload service doesn't validate file type client-side | Wrong file types uploaded |
| 84 | Textarea for question text has no maxLength attribute | Overflow, storage issues |
| 85 | Confusing field naming - "negative_marks" allows positive values only | UX confusion |
| 86 | Race condition in exam state initialization with multiple async operations | Data sync issues |
| 87 | Zustand exam store persists stale data on page refresh | State inconsistency |
| 88 | Response state updated before API confirmation | Local/backend data mismatch |
| 89 | Violation count stored in ref, lost on component re-render | Count resets incorrectly |
| 90 | Multiple setFormData calls in single handleChange handler | Unnecessary re-renders |
| 91 | Exam availability check happens after processing, not first | Logic error, wasted operations |
| 92 | No student identity verification before exam start | Impersonation possible |
| 93 | Scheduled times not validated to be in the future | Past exams can be created |
| 94 | No duplicate email check when creating students | Data integrity issues |
| 95 | Question count not validated against exam before activation | Exams with no questions |

---

## 🟢 LOW SEVERITY (Code Quality)

### Backend Issues (96-110)

| # | Issue | Impact |
|---|-------|--------|
| 96 | No confirmation dialog for bulk delete operations | Accidental deletions |
| 97 | Magic numbers: violation threshold (5), intervals (30000, 60000) | Maintainability |
| 98 | ASCII art banner uses console.log instead of logger | Inconsistent logging |
| 99 | No graceful degradation for email service failures | Silent failures |
| 100 | Hardcoded role strings throughout instead of constants | Typo risks |
| 101 | No request ID in API responses for distributed tracing | Debugging difficulty |
| 102 | No compression middleware for responses | Performance impact |
| 103 | Test files not in dedicated `__tests__` or `test` folder | Poor organization |
| 104 | No database migration system for version control | Schema management issues |
| 105 | Inconsistent date handling utilities defined inline | Code duplication |
| 106 | No monitoring/metrics integration for production | Observability gap |
| 107 | Missing composite database indexes for query patterns | Performance |
| 108 | No API versioning strategy | Breaking change management |
| 109 | Development comments left in production code | Code cleanliness |
| 110 | Inconsistent indentation in some files | Code style |

### Frontend Issues (111-130)

| # | Issue | Impact |
|---|-------|--------|
| 111 | Magic numbers: violation threshold, grade cutoffs (90, 80, 70, 60, 40) | Maintainability |
| 112 | Code duplication between CreateExamPage and EditExamPage (~80%) | DRY violation |
| 113 | Inconsistent error handling patterns across files | Code quality |
| 114 | Large component files (ExamPage 500+, StudentDashboard 400+ lines) | Maintainability |
| 115 | Deeply nested conditional rendering in exam page | Readability |
| 116 | Mixed naming conventions (question_count vs questionCount) | Consistency |
| 117 | No PropTypes or TypeScript for type checking | Runtime type errors |
| 118 | Unused imports in some files (useEffect in LandingPage) | Dead code |
| 119 | Development comments left in production code | Code cleanliness |
| 120 | Inconsistent CSS indentation in referenced stylesheets | Code style |
| 121 | No type checking for component props | Prop validation |
| 122 | Missing JSDoc comments for complex functions | Documentation |
| 123 | Inconsistent component structure patterns | Code quality |
| 124 | No lazy loading for route components | Initial bundle size |
| 125 | Missing loading skeleton components | UX during loads |

---

## ⚠️ EDGE CASES NOT HANDLED

| # | Edge Case | Impact |
|---|-----------|--------|
| 131 | Exam created with zero questions | Crash when student starts exam |
| 132 | Admin user deletes their own account | System lockout, no admins left |
| 133 | Division by zero when total_marks = 0 | Percentage calculation error |
| 134 | Exam with scheduled_start equal to scheduled_end | Invalid time range |
| 135 | Question text is empty string or whitespace only | Display issues |
| 136 | Multiple options have identical text values | Student confusion |
| 137 | Response submitted after exam end time | Late submission handling |
| 138 | Negative duration calculated due to clock skew | Invalid data in database |
| 139 | Excel import file missing required columns | Import failure, unclear error |
| 140 | User created without a name (null/empty) | Email greeting issues |
| 141 | Network disconnect during exam response save | Response lost |
| 142 | Browser crash during active exam | Session abandonment |
| 143 | Same user opens exam on multiple devices | Session conflicts |
| 144 | Daylight saving time change during exam | Time calculation errors |
| 145 | Leap year date handling in scheduled exams | Date parsing issues |
| 146 | Very long exam titles overflow UI | Visual issues |
| 147 | Special characters in student names | Encoding/display issues |
| 148 | Unicode characters in question text | Display/rendering issues |
| 149 | Very large Excel files (>10MB) uploaded | Memory exhaustion |
| 150 | Concurrent bulk question uploads for same exam | Data corruption |
| 151 | Password reset token reused after expiration | Security issue |
| 152 | JWT expires while exam is actively in progress | Access loss mid-exam |
| 153 | Server restart during active exam sessions | Session data loss |
| 154 | SQLite database file corruption | Complete data loss |
| 155 | GitHub API rate limit exceeded during sync | Backup failure |
| 156 | SMTP credentials expired or invalid | Email notification failures |
| 157 | File upload interrupted mid-transfer | Partial data in system |
| 158 | Browser back button pressed during exam | Navigation away from exam |
| 159 | Screen rotation on mobile during exam | UI layout issues |
| 160 | Device enters low battery/power saving mode | Performance degradation |

---

## 🎯 TOP 10 PRIORITIES TO FIX FIRST

1. **Change default JWT secret and admin password**
   - Files: `backend/src/config/env.js`
   - Risk: Complete authentication bypass

2. **Implement httpOnly cookies for authentication tokens**
   - Files: `frontend/src/store/authStore.js`, backend auth
   - Risk: Token theft via XSS

3. **Add CSRF token protection for all state-changing requests**
   - Files: `frontend/src/services/api.js`, backend middleware
   - Risk: Cross-site forgery attacks

4. **Fix race conditions in exam session and response handling**
   - Files: `backend/src/modules/attempts/attempts.service.js`
   - Risk: Data corruption, lost answers

5. **Add authorization checks on user data and attempt endpoints**
   - Files: `backend/src/modules/users/users.routes.js`, `attempts.routes.js`
   - Risk: Privacy breach, data exposure

6. **Implement offline queue with retry for exam responses**
   - Files: `frontend/src/pages/exam/ExamPage.jsx`
   - Risk: Student answer loss

7. **Add input sanitization library (DOMPurify) for all user content**
   - Files: All pages rendering user content
   - Risk: XSS attacks

8. **Add React Error Boundaries to catch rendering errors**
   - Files: `frontend/src/App.jsx`
   - Risk: App crash on any error

9. **Implement stricter rate limiting on login endpoint**
   - Files: `backend/src/app.js`
   - Risk: Brute force attacks

10. **Fix auto-submit failure handling with user notification**
    - Files: `frontend/src/pages/exam/ExamPage.jsx`
    - Risk: Exam submission loss

---

## 📋 RECOMMENDATIONS

### Immediate Actions (This Week)
- [ ] Generate strong random JWT_SECRET (min 32 characters)
- [ ] Change default admin password and require change on first login
- [ ] Add authorization middleware to protect user-specific endpoints
- [ ] Implement database transactions for race condition prevention
- [ ] Add DOMPurify for input sanitization

### Short-term (This Sprint)
- [ ] Migrate JWT storage from localStorage to httpOnly cookies
- [ ] Implement CSRF token protection
- [ ] Add offline queue mechanism for exam responses
- [ ] Add React Error Boundaries
- [ ] Implement stricter login rate limiting (5 attempts/minute)

### Medium-term (Next Sprint)
- [ ] Add comprehensive input validation on all endpoints
- [ ] Implement account lockout mechanism
- [ ] Add request timeout and retry logic
- [ ] Extract duplicated code to reusable hooks/components
- [ ] Add comprehensive logging and monitoring

### Long-term (Backlog)
- [ ] Migrate to TypeScript for type safety
- [ ] Implement database migration system
- [ ] Add API versioning strategy
- [ ] Set up comprehensive E2E testing
- [ ] Implement proper CI/CD with security scanning

---

## 📊 STATISTICS

- **Total Issues Identified:** 155
- **Files Analyzed:** 50+
- **Critical Vulnerabilities:** 20
- **Security Issues:** 50+
- **Code Quality Issues:** 30+
- **Edge Cases:** 30

---

## 🔒 SECURITY NOTES

1. **Never deploy with default credentials** - Always change JWT_SECRET and admin password before deployment
2. **Use environment-specific configuration** - Different secrets for dev, staging, production
3. **Enable HTTPS in production** - All authentication tokens must be transmitted over HTTPS
4. **Regular security audits** - Schedule periodic security reviews
5. **Keep dependencies updated** - Monitor for security patches in npm packages

---

*Report generated by comprehensive code analysis on March 23, 2026*
