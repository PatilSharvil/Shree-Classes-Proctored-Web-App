# WebSocket Live Proctoring - Implementation & Testing Guide

## 📋 Implementation Summary

### ✅ Completed Features

#### **Backend (Socket.io Server)**
1. ✅ Socket.io server integrated with Express HTTP server
2. ✅ JWT-based WebSocket authentication middleware
3. ✅ Room-based architecture (one room per exam)
4. ✅ Student connection handling with session tracking
5. ✅ Admin connection handling with exam room joins
6. ✅ Real-time violation event broadcasting
7. ✅ Student lifecycle events (joined, started, submitted, auto-submitted, disconnected)
8. ✅ Admin-to-student communication (warnings, pause/resume exam)
9. ✅ Rate limiting on violation events (max 1 per 2 seconds)
10. ✅ Active sessions sync on admin room join

#### **Frontend - Student Side**
1. ✅ `useWebSocket` hook for students taking exams
2. ✅ Automatic session room joining on connection
3. ✅ Violation emission via WebSocket (tab switches, looking away, etc.)
4. ✅ Heartbeat mechanism (every 30 seconds)
5. ✅ Exam started/submitted/auto-submitted event emission
6. ✅ Admin warning reception and display
7. ✅ Exam pause/resume reception
8. ✅ Auto-reconnection with exponential backoff

#### **Frontend - Admin Side**
1. ✅ `useAdminWebSocket` hook for admin dashboard
2. ✅ Real-time violation alerts with student details
3. ✅ Live student status updates
4. ✅ Notification system with unread count badge
5. ✅ WebSocket connection status indicator (Live/Polling)
6. ✅ Active sessions tracking
7. ✅ Student lifecycle event tracking
8. ✅ Send warnings to students
9. ✅ Pause/resume exam controls
10. ✅ Merges WebSocket updates with polling data (hybrid approach)

---

## 🧪 Testing Plan

### **Test 1: Backend WebSocket Server Startup**
**Goal:** Verify WebSocket server initializes correctly

**Steps:**
1. Start backend server: `cd backend && npm run dev`
2. Check console for "Socket.io server initialized"
3. Verify startup banner shows "WebSocket: Enabled ✓"

**Expected:**
- Server starts without errors
- WebSocket initialization logged

---

### **Test 2: Student WebSocket Connection**
**Goal:** Verify student can connect and join session

**Steps:**
1. Start frontend: `cd frontend && npm run dev`
2. Login as student (sharvil@shree.com / Student@123)
3. Start an exam (Mathematics)
4. Check browser console for WebSocket connection logs

**Expected:**
- `[WebSocket] Connected: <socket_id>`
- `[WebSocket] Session joined: <session_id>`
- No authentication errors

---

### **Test 3: Admin WebSocket Connection**
**Goal:** Verify admin can connect and join exam room

**Steps:**
1. Open new browser/incognito window
2. Login as admin (admin@example.com / Admin@123)
3. Navigate to Exam → Manage → Proctoring Dashboard
4. Check browser console

**Expected:**
- `[Admin WS] Connected: <socket_id>`
- `[Admin WS] Joining exam room: <exam_id>`
- Green "Live" indicator in header with pulsing dot

---

### **Test 4: Real-Time Violation Broadcasting**
**Goal:** Verify violations appear instantly on admin dashboard

**Steps:**
1. Student starts exam (keep admin dashboard open)
2. Student switches tabs (trigger TAB_SWITCH violation)
3. Admin dashboard should show violation alert immediately

**Expected:**
- Violation appears on admin side in <100ms
- Notification badge increments
- Student card updates with violation count
- Console shows: `[Admin WS] Violation alert: {...}`

---

### **Test 5: Student Lifecycle Events**
**Goal:** Verify all student state changes broadcast correctly

**Events to Test:**
1. ✅ Student starts exam → Admin sees "Student started exam"
2. ✅ Student submits exam → Admin sees "Student submitted exam"
3. ✅ Student auto-submits (threshold) → Admin sees "Student auto-submitted"
4. ✅ Student disconnects → Admin sees "Student disconnected"

**Expected:**
- Each event triggers immediate notification on admin side
- Live sessions list updates automatically

---

### **Test 6: Admin-to-Student Communication**
**Goal:** Verify admin can send warnings to students

**Steps:**
1. Admin clicks "Send Warning" on a student card
2. Student should see warning toast/notification
3. Warning auto-clears after 10 seconds

**Expected:**
- Student receives `admin_warning` event
- Warning displays in exam UI
- Auto-dismisses after 10s

---

### **Test 7: Reconnection Handling**
**Goal:** Verify reconnection works after network interruption

**Steps:**
1. Student disconnects from internet (toggle WiFi)
2. Wait 5 seconds
3. Reconnect to internet
4. Check if WebSocket auto-reconnects

**Expected:**
- Socket.io auto-reconnects
- Student re-joins session automatically
- No data loss

---

### **Test 8: Rate Limiting**
**Goal:** Verify violation rate limiting prevents spam

**Steps:**
1. Student triggers multiple rapid violations (e.g., rapid tab switching)
2. Check backend logs for rate limiting

**Expected:**
- Max 1 violation emitted per 2 seconds via WebSocket
- Additional violations are logged but not broadcast
- Backend API still records all violations

---

### **Test 9: Hybrid Polling + WebSocket**
**Goal:** Verify dashboard works with both WebSocket and polling

**Steps:**
1. Admin dashboard open with WebSocket connected
2. Disable WebSocket in browser dev tools
3. Verify polling continues to work
4. Re-enable WebSocket

**Expected:**
- Dashboard shows "Polling" when WebSocket disconnected
- Polling continues at 10s interval
- Reconnecting shows "Live" again

---

### **Test 10: Multiple Students Concurrent**
**Goal:** Verify multiple students can take exam simultaneously

**Steps:**
1. Open 3 browser windows (3 different students)
2. All students start same exam
3. Each student triggers violations
4. Admin dashboard should show all 3 students

**Expected:**
- All 3 students appear in live sessions
- Violations from each student broadcast independently
- Admin can see all students in real-time

---

## 🎯 Playwright E2E Test Scenarios

We'll use the Playwright MCP to automate testing:

### **Scenario 1: Full Student-to-Admin Flow**
1. Login as student and start exam
2. Login as admin and open proctoring dashboard
3. Student triggers tab switch violation
4. Verify admin sees violation in real-time
5. Student submits exam
6. Verify admin sees submission

### **Scenario 2: Auto-Submission Flow**
1. Student triggers 5+ violations (exceed threshold)
2. Verify exam auto-submits
3. Verify admin receives auto-submission alert

### **Scenario 3: Admin Warning Flow**
1. Admin sends warning to student via WebSocket
2. Verify student receives warning toast

---

## 🚀 How to Test Locally

### **1. Start Backend**
```bash
cd backend
npm run dev
```

Look for:
```
WebSocket: Enabled ✓
Socket.io server initialized
```

### **2. Start Frontend**
```bash
cd frontend
npm run dev
```

### **3. Test Student Flow**
1. Navigate to `http://localhost:5173`
2. Login: `sharvil@shree.com` / `Student@123`
3. Start Mathematics exam
4. Open browser console (F12)
5. Watch for WebSocket connection logs

### **4. Test Admin Flow**
1. Open new incognito window: `http://localhost:5173`
2. Login: `admin@example.com` / `Admin@123`
3. Go to Exam → Manage → Proctoring Dashboard
4. Look for green "Live" indicator in header

### **5. Trigger Violations**
From student browser:
- Switch tabs (Alt+Tab)
- Copy text (Ctrl+C)
- Open print dialog (Ctrl+P)
- Exit fullscreen (Esc)

Watch admin dashboard update in real-time!

---

## 📊 WebSocket Events Reference

### **Client → Server (Student)**
| Event | Payload | Description |
|-------|---------|-------------|
| `join_session` | `{ sessionId, examId }` | Join session room |
| `violation` | `{ sessionId, examId, type, severity, metadata }` | Emit violation |
| `heartbeat` | `{ sessionId, examId, status }` | Keep-alive ping |
| `exam_started` | `{ sessionId, examId }` | Exam started |
| `exam_submitted` | `{ sessionId, examId, submissionTime }` | Manual submission |
| `auto_submitted` | `{ sessionId, examId, reason }` | Auto-submission |

### **Server → Client (Admin)**
| Event | Payload | Description |
|-------|---------|-------------|
| `violation_alert` | `{ sessionId, studentName, violation, ... }` | Real-time violation |
| `student_joined` | `{ sessionId, examId, userId }` | Student connected |
| `student_started_exam` | `{ sessionId, examId }` | Exam started |
| `student_submitted_exam` | `{ sessionId, examId }` | Exam submitted |
| `student_auto_submitted` | `{ sessionId, examId, reason }` | Auto-submitted |
| `student_disconnected` | `{ sessionId, examId }` | Connection lost |
| `active_sessions` | `{ examId, sessions: [...] }` | Session list on join |
| `live_stats` | `{ examId, stats }` | Periodic stats update |

### **Admin → Server → Student**
| Event | Payload | Description |
|-------|---------|-------------|
| `send_student_warning` | `{ sessionId, examId, message }` | Send warning |
| `exam_paused` | `{ examId }` | Pause all students |
| `exam_resumed` | `{ examId }` | Resume all students |

---

## 🔍 Debugging Tips

### **Check WebSocket Connection**
```javascript
// In browser console
io().connected // Should be true
```

### **View Active Rooms**
```javascript
// In backend logs
// Look for: "joined exam room: exam_<id>"
```

### **Monitor Events**
```javascript
// Student browser
socket.onAny((event, ...args) => {
  console.log('WS Event:', event, args);
});

// Admin browser
socket.onAny((event, ...args) => {
  console.log('WS Event:', event, args);
});
```

### **Force Disconnect/Reconnect**
```javascript
// Disconnect
socket.disconnect()

// Reconnect
socket.connect()
```

---

## ⚠️ Known Limitations

1. **Render Free Tier**: WebSockets disconnect after 15 min inactivity (use paid tier for production)
2. **Browser Compatibility**: WebSocket requires modern browsers (IE11 not supported)
3. **Firewall Issues**: Some corporate networks block WebSocket connections
4. **Rate Limiting**: Violations limited to 1 per 2 seconds via WebSocket (API still records all)

---

## 🎨 Future Enhancements (Not Implemented Yet)

1. 📹 Live webcam stream to admin (privacy concern)
2. 🎵 Sound notifications for critical violations
3. 📊 Real-time violation heatmap visualization
4. 📱 Push notifications for admin mobile
5. 🤖 AI-powered anomaly detection alerts
6. 📈 Historical WebSocket event replay

---

## ✅ Next Steps After Testing

1. ✅ Run all Playwright E2E tests
2. ✅ Verify all 10 test scenarios pass
3. ✅ Test with 5+ concurrent students
4. ✅ Test reconnection scenarios
5. ✅ Monitor backend logs for errors
6. ✅ Check browser console for warnings
7. ✅ Verify rate limiting works correctly
8. ✅ Test on different browsers (Chrome, Firefox, Edge)

**After successful testing, we can push to GitHub.**

---

*Implementation Date: April 12, 2026*
*Status: ✅ Ready for Testing*
