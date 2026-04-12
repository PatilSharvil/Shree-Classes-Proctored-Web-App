# Shree Classes Proctored Web App - Project Context

## Overview
This is a comprehensive online proctored exam system for Shree Science Academy, built with React (frontend) and Node.js/Express (backend), deployed on Vercel (frontend) and Render (backend).

---

## 🚀 Implemented Features

### 1. **AI-Powered Proctoring System** (Primary Feature)
- **Tab Switch Threshold**: Custom threshold per exam, auto-submits when exceeded
- **Looking Away Detection**: Tracks gaze deviations (left/right/up/down), auto-submits on threshold breach
- **Hybrid Violation Tracking**: Generic violation type + specific direction logging
- **Cheating Detection Dashboard**: Admin can view student risk scores, violation breakdowns
- **AI Face Detection**: MediaPipe-based face tracking at 2 FPS
- **Violation Types**: TAB_SWITCH, LOOKING_AWAY, NO_FACE, RAPID_TAB_SWITCH

### 2. **Math Equation Editor**
- Full LaTeX support with KaTeX rendering
- Interactive equation builder with templates (calculus, fractions, matrices, etc.)
- Supports inline equations in questions, options, and explanations
- MathLive integration for visual equation editing

### 3. **Image Upload for Questions**
- Base64 storage in SQLite (no external dependencies)
- Supports images for: question, options A/B/C/D, explanation
- Automatic compression (800px max width, 80% quality)
- Max 500KB per image validation

### 4. **Bulk Import Features**
- **Student Import**: Excel upload for bulk student creation
- **Question Import**: Excel upload for bulk question creation
- Template download functionality

### 5. **Exam Management**
- Custom tab switch and looking away thresholds per exam
- Preset buttons: Strict (3), Normal (5), Lenient (10)
- Exam creation with scheduling, duration, marks configuration

---

## 👥 Created Students (6 Total)
| Name | Email | Password |
|------|-------|----------|
| Sharvil | sharvil@shree.com | Student@123 |
| Nidhi | nidhi@shree.com | Student@123 |
| Vaishnavi | vaishnavi@shree.com | Student@123 |
| Mukul | mukul@shree.com | Student@123 |
| Raj | raj@shree.com | Student@123 |
| Raghav | raghav@shree.com | Student@123 |

## 📝 Created Exams (3 Total)
| Subject | Questions | Duration | Thresholds |
|---------|-----------|----------|------------|
| Mathematics | 10 | 10 mins | Default (5/5) |
| Physics | 10 | 10 mins | Default (5/5) |
| Chemistry | 10 | 10 mins | Default (5/5) |

---

## 🏗️ Technical Architecture

### Frontend Stack
- React + Vite
- Tailwind CSS for styling
- Playwright for E2E testing
- KaTeX for math rendering
- MediaPipe for AI proctoring

### Backend Stack
- Node.js + Express
- SQLite with better-sqlite3
- JWT authentication
- CSRF protection
- Rate limiting

### Deployment
- **Frontend**: Vercel (https://shree-science-academy.vercel.app)
- **Backend**: Render (free tier)
- **Database**: SQLite with GitHub sync backup

---

## 📊 Database Schema Highlights

### Exams Table
- `tab_switch_threshold INTEGER DEFAULT 5`
- `looking_away_threshold INTEGER DEFAULT 5`

### Questions Table
- `question_image TEXT` (base64)
- `option_a_image`, `option_b_image`, `option_c_image`, `option_d_image TEXT`
- `explanation_image TEXT`

### Violations Table
- `type TEXT` (TAB_SWITCH, LOOKING_AWAY, NO_FACE, etc.)
- `severity TEXT` (LOW, MEDIUM, HIGH, CRITICAL)
- `metadata TEXT` (JSON with direction, count, etc.)

---

## 🔧 Key Configuration

### Admin Credentials
- Email: `admin@example.com`
- Password: `Admin@123`

### Default Thresholds
- Tab Switch Limit: 5
- Looking Away Limit: 5
- Violation Weighting: LOW=1, MEDIUM=2, HIGH=3, CRITICAL=5

---

## 📋 API Endpoints (Recent Additions)

### Proctoring
- `GET /api/proctoring/cheating/:sessionId` - Student cheating data
- `GET /api/proctoring/cheating-summary/:examId` - Exam cheating summary

### Questions
- Images handled via base64 in question payload
- Max 500KB per image validated server-side

---

## 🎯 Future Considerations
1. Image optimization for larger deployments
2. WebSocket for real-time proctoring updates
3. Cloud storage option for images (if DB grows too large)
4. Advanced analytics for cheating patterns

---

## 📞 Support
- Repository: https://github.com/PatilSharvil/Shree-Classes-Proctored-Web-App
- Deployed: https://shree-science-academy.vercel.app

---

*Last Updated: April 11, 2026*
