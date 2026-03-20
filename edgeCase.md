# Edge Cases - Proctored MCQ Examination System

Comprehensive list of edge cases for the proctored examination system, categorized by feature.

---

## 🔐 Authentication & Authorization Edge Cases

| # | Edge Case | Impact | Mitigation |
|---|-----------|--------|------------|
| 1 | **Concurrent logins** - Same user logging in from multiple devices/browsers simultaneously | Session conflicts, answer overwrites | Implement session locking or allow multi-device with merge logic |
| 2 | **JWT expiration during exam** - Token expires while student is mid-exam | Loss of access, unsaved answers | Implement token refresh mechanism during active exam sessions |
| 3 | **Password change during active session** - Admin changes password while user has active session | Existing sessions remain valid | Invalidate all sessions on password change or force re-auth |
| 4 | **Session hijacking** - Stolen JWT token being used from different IP | Unauthorized access | Implement IP binding or device fingerprinting |
| 5 | **Admin deletes own account** - Admin attempting to delete their own account | Lockout from system | Prevent self-deletion, require another admin to confirm |
| 6 | **Role escalation** - Student trying to manipulate JWT to gain admin access | Security breach | Validate roles server-side on every request |

---

## 📝 Exam Management Edge Cases

| # | Edge Case | Impact | Mitigation |
|---|-----------|--------|------------|
| 1 | **Zero-duration exam** - `duration_minutes` set to 0 or negative value | Exam ends immediately | Validate duration > 0 on exam creation |
| 2 | **Exam with no questions** - Student starts exam that has empty question bank | Empty exam, confusing UX | Prevent exam activation without questions |
| 3 | **Overlapping exam schedules** - Same student enrolled in multiple exams with overlapping times | Student can't take both exams | Show conflict warning during enrollment |
| 4 | **Timezone mismatches** - `scheduled_start`/`scheduled_end` interpreted differently across timezones | Exam starts/ends at wrong time | Store and display times in user's local timezone |
| 5 | **Exam deletion with active attempts** - Admin deletes exam while students are actively taking it | Data loss, broken sessions | Prevent deletion or cascade with proper cleanup |
| 6 | **Negative marks > positive marks** - `negative_marks` configured higher than `marks` | Negative total scores possible | Validate negative_marks <= marks |
| 7 | **Total marks mismatch** - Sum of question marks doesn't match `total_marks` | Incorrect percentage calculation | Auto-calculate total_marks from questions |
| 8 | **Exam end time during student exam** - Exam ends while student is still answering | Forced submission, incomplete answers | Show countdown warning, auto-submit gracefully |

---

## ⏱️ Exam Session Edge Cases

| # | Edge Case | Impact | Mitigation |
|---|-----------|--------|------------|
| 1 | **Multiple simultaneous attempts** - Same student trying to start exam multiple times | Data inconsistency | Enforce single active session per exam per user |
| 2 | **Session timeout at exact moment of submission** - Network delay causes submission after timeout | Submission rejected | Allow grace period for in-flight submissions |
| 3 | **Browser crash mid-exam** - Student's browser crashes, expects resume capability | Lost progress | Implement auto-save and session recovery |
| 4 | **Device switch mid-exam** - Student switches from mobile to desktop during same session | Session invalidation | Support session transfer with re-authentication |
| 5 | **Clock manipulation** - Student changes system time to extend exam duration | Extended exam time | Use server-side time for all calculations |
| 6 | **Session resumption after auto-submit** - Student tries to resume after system auto-submitted | Data corruption | Block access to submitted sessions |
| 7 | **Concurrent answer saves** - Multiple rapid answer changes causing race conditions | Lost answers | Implement debouncing and optimistic locking |

---

## 🎯 Question & Answer Edge Cases

| # | Edge Case | Impact | Mitigation |
|---|-----------|--------|------------|
| 1 | **Empty option text** - Options A/B/C/D with empty or null values | Confusing questions | Validate all options have content |
| 2 | **Multiple correct options** - Question has more than one correct answer configured | Grading ambiguity | Enforce single correct option per question |
| 3 | **No correct option** - Question has no correct answer configured | All answers marked wrong | Validate correct_option is set |
| 4 | **Duplicate options** - Options A and B have identical text | Confusing for students | Warn admin during question creation |
| 5 | **Special characters in questions** - LaTeX, emojis, or HTML breaking the UI | Rendering issues | Sanitize and properly escape content |
| 6 | **Very long question text** - Questions exceeding display bounds | UI overflow, readability issues | Implement text truncation with expand |
| 7 | **Question deletion during exam** - Admin deletes question while students are answering it | Broken references | Soft delete or prevent during active sessions |
| 8 | **Shuffle inconsistency** - Options shuffled differently on each page load | Answer mapping errors | Store shuffle seed per session |

---

## 📡 Network & Connectivity Edge Cases

| # | Edge Case | Impact | Mitigation |
|---|-----------|--------|------------|
| 1 | **Offline answer queuing overflow** - Extended offline period causing queue to overflow | Lost answers | Implement local storage with size limits |
| 2 | **Response save during network loss** - Student answers while offline, sync fails silently | Lost answers | Show offline indicator, queue with retry |
| 3 | **Duplicate submissions** - Network retry causing same answer to be saved twice | Data inconsistency | Use idempotent API with unique request IDs |
| 4 | **API timeout during submit** - Final submission fails due to network timeout | Exam not submitted | Implement retry with exponential backoff |
| 5 | **Partial data sync** - Some answers synced, others lost during intermittent connectivity | Incomplete results | Transaction-based sync with rollback |

---

## 👁️ Proctoring Edge Cases

| # | Edge Case | Impact | Mitigation |
|---|-----------|--------|------------|
| 1 | **Rapid tab switching** - Student switching tabs multiple times per second | Violation flood | Implement debounce between violations |
| 2 | **Legitimate visibility change** - Phone call, notification, or OS update triggering visibility change | False positive violation | Allow 1-2 warnings before counting violations |
| 3 | **Browser without fullscreen API** - Some browsers don't support fullscreen enforcement | Proctoring bypass | Show warning, continue with reduced security |
| 4 | **Multiple monitors** - Student using second monitor not detected as violation | Cheating opportunity | Implement screen monitoring or warn about multi-monitor |
| 5 | **Mobile app switching** - Mobile browsers handle visibility differently than desktop | Inconsistent behavior | Platform-specific detection thresholds |
| 6 | **Violation count race condition** - Threshold check happens before violation is recorded | Missed auto-submit | Use atomic operations for violation counting |
| 7 | **Page refresh counted as violation** - Student refreshes page, counted as tab switch | False positive | Distinguish refresh from tab switch |
| 8 | **Back button navigation** - Browser back button triggering visibility change | False positive | Handle browser navigation separately |

---

## 📊 Result & Analytics Edge Cases

| # | Edge Case | Impact | Mitigation |
|---|-----------|--------|------------|
| 1 | **Division by zero** - Percentage calculation when `total_marks` is 0 | NaN/Infinity errors | Handle zero marks case explicitly |
| 2 | **Negative percentage** - Negative marks causing negative overall percentage | Display issues, confusion | Floor percentage at 0 |
| 3 | **Rounding discrepancies** - Percentage rounding causing display inconsistencies | Student confusion | Standardize rounding (2 decimal places) |
| 4 | **Unattempted vs incorrect** - Questions with no response vs wrong response confusion | Incorrect analytics | Track unattempted separately |
| 5 | **Result modification after submission** - Student manipulating submitted responses | Grade tampering | Immutable records after submission |
| 6 | **History duplicate entries** - Same exam attempt recorded multiple times in history | Incorrect statistics | Unique constraint on user+exam+session |

---

## 🗄️ Database Edge Cases

| # | Edge Case | Impact | Mitigation |
|---|-----------|--------|------------|
| 1 | **Database file corruption** - SQLite file gets corrupted during write operation | Data loss | Implement WAL mode, regular backups |
| 2 | **Concurrent write conflicts** - Multiple students submitting at same time | Lost writes | Use transactions with proper locking |
| 3 | **Foreign key violations** - Deleting exam without cascading to questions/responses | Orphaned records | Enable foreign key constraints |
| 4 | **Database disk full** - SQLite database reaching storage limits | Write failures | Monitor disk space, implement cleanup |
| 5 | **Orphaned sessions** - Sessions without corresponding user or exam | Data inconsistency | Cascade delete or soft delete with cleanup job |

---

## 📱 Mobile-Specific Edge Cases

| # | Edge Case | Impact | Mitigation |
|---|-----------|--------|------------|
| 1 | **Incoming call during exam** - Phone call interrupting exam session | Visibility change violation | Detect call state, pause proctoring temporarily |
| 2 | **Low battery shutdown** - Device dying mid-exam | Lost progress | Warn about battery, auto-save frequently |
| 3 | **Touch target overlap** - Small screens causing accidental option selection | Wrong answers submitted | Ensure 44x44px minimum touch targets |
| 4 | **Screen rotation** - Orientation change breaking UI layout | UI breakage | Lock orientation or test both modes |
| 5 | **Mobile browser limitations** - Some mobile browsers don't support certain APIs | Feature degradation | Implement feature detection and fallbacks |

---

## 🔄 Background Job Edge Cases

| # | Edge Case | Impact | Mitigation |
|---|-----------|--------|------------|
| 1 | **Cron job overlap** - Previous job still running when next scheduled run starts | Duplicate processing | Implement job locking mechanism |
| 2 | **Server restart during job** - GitHub sync interrupted mid-upload | Incomplete backup | Implement atomic uploads with rollback |
| 3 | **Stale session false positive** - Active student marked as stale due to inactivity threshold | Premature auto-submit | Use longer timeout, show warning before action |
| 4 | **Email notification failures** - SMTP server down, reminders not sent | Missed communications | Queue emails with retry, fallback notifications |
| 5 | **Time drift on server** - Server clock drift causing premature/late auto-submits | Incorrect exam timing | Sync with NTP, use UTC internally |

---

## 🛡️ Security Edge Cases

| # | Edge Case | Impact | Mitigation |
|---|-----------|--------|------------|
| 1 | **SQL injection via question text** - Malicious SQL in question/explanation fields | Data breach | Use parameterized queries, sanitize input |
| 2 | **XSS in answer display** - Script tags in option text executing on result page | Account compromise | Escape all user-generated content |
| 3 | **Rate limiting bypass** - Rapid API calls to guess answers or violate proctoring | Abuse | Implement per-user rate limiting |
| 4 | **CORS misconfiguration** - API accessible from unauthorized domains | CSRF attacks | Configure strict CORS whitelist |
| 5 | **Sensitive data in response** - Correct answers leaked in API response during exam | Cheating | Exclude correct_option during active exams |

---

## 📤 Bulk Upload Edge Cases

| # | Edge Case | Impact | Mitigation |
|---|-----------|--------|------------|
| 1 | **Malformed Excel file** - Corrupted or wrong format Excel file | Import failure | Validate file format before processing |
| 2 | **Missing required columns** - Excel missing question_text or correct_option columns | Partial import | Validate schema before import |
| 3 | **Invalid option values** - Correct option set to 'E' instead of A/B/C/D | Data integrity issues | Validate option values (A-D only) |
| 4 | **Duplicate question IDs** - Excel containing duplicate question identifiers | Import conflicts | Generate IDs server-side or validate uniqueness |
| 5 | **Massive file upload** - Excel with 10,000+ questions causing timeout | Server crash | Implement chunked processing with progress |

---

## 📋 Testing Checklist

### Critical Edge Cases (Must Test)
- [ ] Exam with zero questions
- [ ] JWT expiration during active exam
- [ ] Network loss during answer save
- [ ] Multiple simultaneous exam attempts
- [ ] Division by zero in percentage calculation
- [ ] SQL injection in question text
- [ ] Concurrent answer submissions

### High Priority Edge Cases (Should Test)
- [ ] Browser crash mid-exam recovery
- [ ] Tab switch false positives
- [ ] Timezone handling for scheduled exams
- [ ] Mobile incoming call handling
- [ ] Bulk upload with invalid data
- [ ] Database concurrent write conflicts

### Medium Priority Edge Cases (Nice to Test)
- [ ] Screen rotation on mobile
- [ ] Multiple monitor detection
- [ ] Email notification failures
- [ ] Result rounding discrepancies
- [ ] Touch target overlap on small screens

---

## 📝 Notes

- Edge cases marked as **Critical** should have automated tests
- All security-related edge cases require immediate attention
- Mobile-specific edge cases should be tested on real devices
- Network edge cases should be tested with throttling tools
- Consider implementing chaos engineering for production resilience

---

*Generated for: Shree-Classes-Proctored-Web-App*
*Last Updated: March 19, 2026*
