# 🛡️ Proctoring System Documentation

## Overview

The enhanced proctoring system provides comprehensive exam monitoring for both desktop and mobile devices, with real-time admin dashboards and detailed activity logging.

---

## 🎯 Features

### For Students (Exam Takers)

| Feature | Description |
|---------|-------------|
| **Tab Switch Detection** | Detects when user switches tabs or minimizes the browser |
| **Fullscreen Monitoring** | Tracks fullscreen mode entry/exit |
| **Network Monitoring** | Detects internet connection loss and restoration |
| **Clipboard Monitoring** | Prevents copy/paste during exams |
| **Print Prevention** | Blocks print attempts |
| **Idle Detection** | Flags periods of inactivity (5+ minutes) |
| **Rapid Tab Switch Detection** | Detects suspicious rapid tab switching patterns |
| **Visual Status Indicators** | Shows online status, fullscreen mode, and violation count |
| **Warning Notifications** | Real-time warnings for violations |

### For Admins (Proctors)

| Feature | Description |
|---------|-------------|
| **Live Monitoring Dashboard** | Real-time view of all active exam sessions |
| **Activity Timeline** | Detailed chronological log of all student actions |
| **Violation Tracking** | Weighted violation scoring system |
| **Auto-Refresh** | Dashboard updates every 10 seconds automatically |
| **Violation Patterns** | Analytics on common violation types |
| **Export Reports** | Download proctoring reports for exams |
| **Severity Levels** | LOW, MEDIUM, HIGH, CRITICAL violation classifications |
| **Session Summary** | Overview of all exam sessions with violation stats |

---

## 🏗️ Architecture

### Backend Components

```
backend/src/modules/proctoring/
├── proctoring.service.js      # Business logic, database operations
├── proctoring.controller.js   # HTTP request handlers
└── proctoring.routes.js       # API route definitions
```

### Frontend Components

```
frontend/src/
├── hooks/useProctoring.js     # React hook for proctoring monitoring
├── services/api.js            # Proctoring API client
├── pages/admin/ProctoringDashboardPage.jsx  # Admin monitoring UI
└── pages/exam/ExamPage.jsx    # Student exam interface
```

### Database Tables

```sql
-- Violations table (enhanced)
violations (
  id, session_id, type, description,
  severity, timestamp, metadata
)

-- NEW: Activity logs table
proctoring_logs (
  id, session_id, event_type, event_data,
  ip_address, user_agent, timestamp, is_violation
)
```

---

## 📊 Violation Types & Severity

### Violation Types

| Type | Severity | Description |
|------|----------|-------------|
| `TAB_SWITCH` | MEDIUM | User switched to another tab/window |
| `WINDOW_BLUR` | LOW | Exam window lost focus |
| `FULLSCREEN_EXIT` | MEDIUM | User exited fullscreen mode |
| `VISIBILITY_CHANGE` | LOW | Page visibility changed |
| `NETWORK_LOST` | MEDIUM | Internet connection lost |
| `NETWORK_RESTORED` | LOW | Connection restored |
| `COPY_ATTEMPT` | HIGH | User tried to copy content |
| `PASTE_ATTEMPT` | HIGH | User tried to paste content |
| `PRINT_ATTEMPT` | HIGH | User tried to print exam |
| `RAPID_TAB_SWITCH` | HIGH | 3+ tab switches within 1 minute |
| `IDLE_TIMEOUT` | MEDIUM | No activity for 5+ minutes |

### Severity Levels & Weights

| Severity | Weight | Threshold Impact |
|----------|--------|------------------|
| LOW | 1 | Minor infractions |
| MEDIUM | 2 | Standard violations |
| HIGH | 3 | Serious violations |
| CRITICAL | 5 | Severe misconduct |

**Auto-submit threshold:** 5 weighted points

---

## 🔌 API Endpoints

### Student-Facing

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/proctoring/violations` | Record a violation |
| `POST` | `/api/proctoring/log` | Log activity event |
| `GET` | `/api/proctoring/violations/:sessionId` | Get session violations |
| `GET` | `/api/proctoring/activity/:sessionId` | Get activity logs |
| `GET` | `/api/proctoring/timeline/:sessionId` | Get activity timeline |
| `GET` | `/api/proctoring/check-submit/:sessionId` | Check auto-submit status |
| `GET` | `/api/proctoring/score/:sessionId` | Get violation score |

### Admin-Only

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/proctoring/stats/:examId` | Exam violation statistics |
| `GET` | `/api/proctoring/summary/:examId` | Activity summary for exam |
| `GET` | `/api/proctoring/live/:examId` | Live active sessions |
| `GET` | `/api/proctoring/breakdown` | Violation type breakdown |
| `GET` | `/api/proctoring/patterns` | Violation patterns across exams |
| `DELETE` | `/api/proctoring/violations/:sessionId` | Clear violations |
| `GET` | `/api/proctoring/export/:examId` | Export proctoring report |

---

## 📱 Mobile Support

The proctoring system works on mobile devices with these considerations:

### Supported Events
- ✅ Visibility change (app switch)
- ✅ Network connectivity
- ✅ Idle detection
- ✅ Touch activity monitoring

### Limitations
- ⚠️ Fullscreen API has limited support on mobile browsers
- ⚠️ Some mobile browsers restrict clipboard monitoring
- ⚠️ Background tab detection varies by browser

### Best Practices for Mobile
1. Use Chrome or Firefox for best compatibility
2. Keep screen on during exam
3. Don't switch to other apps
4. Ensure stable internet connection

---

## 🖥️ Admin Dashboard Guide

### Accessing the Dashboard

1. Navigate to **Admin → Exams**
2. Click on any exam
3. Click the **📊 Proctoring** button

### Dashboard Sections

#### 1. Live Monitoring (🔴)
- Shows currently active sessions
- Updates every 10 seconds
- Displays recent violations (last 5 minutes)
- Shows last activity timestamp

#### 2. All Sessions Summary (📊)
- Complete list of all exam sessions
- Total events and violations per student
- Weighted violation scores
- Quick access to activity timelines

#### 3. Activity Timeline Modal
- Chronological event log
- Color-coded violations (red) vs normal events (blue)
- Severity badges
- Timestamps for each event

### Interpreting Violation Scores

| Score | Color | Action |
|-------|-------|--------|
| 0-2 | 🟢 Green | Normal behavior |
| 3-4 | 🟡 Yellow | Warning zone |
| 5+ | 🔴 Red | Auto-submit triggered |

---

## ⚙️ Configuration

### Environment Variables

```env
# Proctoring Configuration
PROCTOR_VIOLATION_THRESHOLD=5
PROCTOR_AUTO_SUBMIT=false  # Set to true for automatic submission
```

### Hook Configuration Options

```javascript
useProctoring(sessionId, {
  violationThreshold: 5,        // Auto-submit at this score
  onViolationThreshold: fn,     // Callback when threshold reached
  onViolation: fn,              // Callback on each violation
  enableFullscreen: true,       // Monitor fullscreen
  enableTabSwitch: true,        // Monitor tab switches
  enableNetworkMonitor: true,   // Monitor connectivity
  enableClipboardMonitor: true, // Block copy/paste
  enableIdleDetect: true,       // Detect inactivity
  idleTimeoutMs: 300000         // 5 minutes idle timeout
});
```

---

## 🔒 Privacy & Security

### Data Collection

The system logs:
- Browser events (tab switches, focus changes)
- Network status changes
- User activity timestamps
- IP address and user agent
- Violation details

### Data Storage

- Violations: Stored indefinitely for audit purposes
- Activity logs: Stored with session data
- All data tied to exam session ID

### Security Measures

- All proctoring routes require authentication
- Admin endpoints require ADMIN role authorization
- Activity logs include IP/user agent for forensics
- No video/audio recording (privacy-preserving)

---

## 🐛 Troubleshooting

### Common Issues

#### "Fullscreen not working"
- Browser may block auto-fullscreen
- Student must grant permission
- Some browsers don't support fullscreen on mobile

#### "False tab switch detections"
- Browser notifications can trigger blur
- System dialogs may cause focus loss
- Consider these when reviewing violations

#### "Network lost showing incorrectly"
- Brief network blips are logged
- System automatically recovers
- Check student's actual connectivity

#### "Dashboard not updating"
- Check auto-refresh toggle
- Verify admin permissions
- Ensure exam has active sessions

---

## 📈 Best Practices

### For Admins

1. **Review before auto-submit**: Check activity timeline before accepting auto-submit
2. **Consider context**: Network issues may cause false positives
3. **Communicate**: Inform students about proctoring before exam
4. **Test first**: Run a practice exam to verify settings
5. **Export reports**: Keep records for disputes

### For Students

1. **Close other apps**: Prevent accidental tab switches
2. **Disable notifications**: Avoid focus loss from alerts
3. **Stable connection**: Use reliable internet
4. **Stay on page**: Don't switch tabs during exam
5. **Ask for help**: Contact admin if technical issues occur

---

## 🚀 Future Enhancements

Planned improvements:
- [ ] Webcam monitoring (optional)
- [ ] AI-powered suspicious behavior detection
- [ ] Real-time chat with proctor
- [ ] Browser lockdown mode
- [ ] Screen recording (with consent)
- [ ] Voice detection for group cheating
- [ ] Geolocation verification
- [ ] Device fingerprinting

---

## 📞 Support

For issues or questions about the proctoring system:
1. Check this documentation first
2. Review activity timelines for context
3. Contact system administrator for violations disputes
4. Report bugs through the issue tracker

---

**Last Updated:** March 23, 2026  
**Version:** 2.0.0 (Enhanced Proctoring)
