# Proctored MCQ Examination System

A production-ready, mobile-first web application for conducting proctored MCQ examinations with admin-controlled access.

## 🚀 Features

### For Students
- **Mobile-First UI** - Optimized for mobile devices with touch-friendly controls
- **Secure Exams** - Tab-switch detection and proctoring warnings
- **Auto-Save** - Responses saved automatically (local + server)
- **Resume Capability** - Continue exam after network loss or refresh
- **Question Palette** - Visual indicator for Answered/Not Answered/Marked for Review questions
- **Result Review** - Detailed solutions with correct/incorrect answer highlighting
- **Dashboard** - View available exams and attempt history with scores

### For Admins
- **Exam Management** - Create, schedule, and manage exams with full CRUD operations
- **Bulk Upload** - Import questions via Excel/CSV
- **Student Management** - Create and manage student accounts
- **Analytics Dashboard** - View exam statistics, grade distribution, and top performers
- **Proctoring Dashboard** - Monitor violations and suspicious activity
- **Question Management** - Add, edit, delete questions with difficulty levels
- **Attempt Tracking** - View all student attempts with detailed results

## 🛠️ Tech Stack

### Backend
- **Node.js + Express** - REST API server
- **SQLite** - Real-time data storage
- **GitHub API + Excel** - Backup and long-term storage
- **JWT** - Secure authentication
- **Better-SQLite3** - Fast embedded database
- **Nodemailer** - Email notifications

### Frontend
- **React 18** - Modern UI framework
- **Vite** - Fast build tool
- **Tailwind CSS** - Mobile-first styling
- **Zustand** - Lightweight state management
- **React Router** - Client-side routing

### DevOps
- **Docker + Docker Compose** - Containerized deployment
- **Nginx** - Production web server for frontend

## 📁 Project Structure

```
proctored-exam-system/
├── backend/
│   ├── src/
│   │   ├── modules/         # Feature modules
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── exams/
│   │   │   ├── questions/
│   │   │   ├── attempts/
│   │   │   └── proctoring/
│   │   ├── services/        # GitHub, Excel services
│   │   ├── middlewares/     # Auth, error handlers
│   │   ├── utils/
│   │   ├── config/          # Database, env config
│   │   ├── app.js
│   │   └── server.js
│   ├── data/                # SQLite database
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── features/        # Feature-specific logic
│   │   ├── store/           # Zustand stores
│   │   ├── services/        # API calls
│   │   ├── hooks/           # Custom hooks
│   │   ├── layouts/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Docker and Docker Compose (for containerized deployment)
- GitHub Personal Access Token (for Excel backup)

### Option 1: Docker (Recommended)

1. **Clone the repository**
```bash
cd proctored-exam-system
```

2. **Create environment file**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your settings
```

3. **Start with Docker Compose**
```bash
docker-compose up --build
```

4. **Access the application**
- Frontend: http://localhost
- Backend API: http://localhost:5000

### Option 2: Local Development

#### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your settings
npm run dev
```

Backend runs on http://localhost:5000

#### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend runs on http://localhost:5173

## 🔐 Default Credentials

**Admin Account:**
- Email: `admin@example.com`
- Password: `Admin@123`

⚠️ **Change the password after first login!**

## 📝 Configuration

### Environment Variables

#### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `5000` |
| `JWT_SECRET` | JWT signing secret | *(required)* |
| `JWT_EXPIRE` | Token expiry | `1h` |
| `GITHUB_TOKEN` | GitHub PAT for backup | *(optional)* |
| `GITHUB_OWNER` | GitHub username | *(required for backup)* |
| `GITHUB_REPO` | GitHub repo name | `exam-data` |
| `GITHUB_BRANCH` | GitHub branch | `main` |
| `ADMIN_EMAIL` | Default admin email | `admin@example.com` |
| `ADMIN_PASSWORD` | Default admin password | `Admin@123` |
| `PROCTOR_VIOLATION_THRESHOLD` | Violations before auto-submit | `5` |
| `SMTP_HOST` | SMTP server host | *(optional)* |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | *(optional)* |
| `SMTP_PASS` | SMTP password | *(optional)* |
| `SMTP_FROM` | From email address | `noreply@exam-system.com` |

#### Frontend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:5000/api` |

## 📚 API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Users (Admin)
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Exams
- `GET /api/exams` - Get all exams
- `GET /api/exams/active` - Get active exams
- `GET /api/exams/:id` - Get exam by ID
- `POST /api/exams` - Create exam (Admin)
- `PUT /api/exams/:id` - Update exam (Admin)
- `DELETE /api/exams/:id` - Delete exam (Admin)

### Questions
- `GET /api/exams/:examId/questions` - Get questions for exam
- `POST /api/exams/:examId/questions` - Add question (Admin)
- `POST /api/exams/:examId/questions/bulk` - Bulk add questions (Admin)
- `POST /api/exams/:examId/questions/upload` - Upload Excel (Admin)

### Attempts
- `POST /api/attempts/start` - Start exam
- `POST /api/attempts/:sessionId/respond` - Save response
- `POST /api/attempts/:sessionId/submit` - Submit exam
- `GET /api/attempts/history` - Get attempt history
- `GET /api/attempts/:sessionId/details` - Get attempt details with responses
- `GET /api/attempts/exam/:examId` - Get all attempts for an exam (Admin)

### Proctoring
- `POST /api/proctoring/violations` - Record violation
- `GET /api/proctoring/violations/:sessionId` - Get violations
- `GET /api/proctoring/check-submit/:sessionId` - Check if should auto-submit
- `GET /api/proctoring/stats/:examId` - Get exam violation stats (Admin)
- `GET /api/proctoring/breakdown` - Get violation type breakdown (Admin)

## 📱 Mobile Features

- **Touch-optimized** - All buttons are 44x44px minimum
- **Responsive layout** - Works on all screen sizes
- **Sticky timer** - Always visible during exam
- **Bottom navigation** - Easy thumb access
- **Offline support** - Queue responses when offline

## 🛡️ Proctoring System

### Desktop
- Tab switch detection
- Window blur detection
- Fullscreen enforcement (best effort)

### Mobile
- Visibility change detection
- Warning system for violations
- Configurable violation threshold

### Violation Types
- `TAB_SWITCH` - User left the exam page
- `WINDOW_BLUR` - Window lost focus
- `MULTIPLE_TABS` - Multiple tabs detected (if supported)

## ⏰ Scheduled Tasks (Background Jobs)

The system runs automated background tasks:

| Task | Frequency | Description |
|------|-----------|-------------|
| Exam Timeout Check | Every 30s | Auto-submits exams that exceeded duration |
| Exam Reminders | Every 5m | Sends email reminders for exams starting in 1 hour |
| GitHub Sync | Every 5m | Backs up SQLite data to GitHub/Excel |
| Stale Session Cleanup | Every 1h | Auto-submits abandoned exam sessions (24h inactive) |

## 📧 Email Notifications

Configure SMTP settings to enable:

- **Exam Scheduled** - Notifies students when a new exam is scheduled
- **Exam Reminder** - Sends reminder 1 hour before exam starts
- **Exam Result** - Sends detailed result with score breakdown after submission

## 📊 Data Storage

### SQLite (Real-time)
- User sessions
- Active exam attempts
- Responses (with auto-save)
- Proctoring violations

### GitHub + Excel (Backup)
- Periodic sync every 5 minutes
- Long-term storage
- Export format
- Version history

## 🔒 Security

- JWT-based authentication
- Role-based access control (ADMIN/STUDENT)
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS protection
- Helmet.js security headers

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📈 Scaling Considerations

For larger deployments:
1. Replace SQLite with PostgreSQL
2. Add Redis for session caching
3. Use a proper message queue for GitHub sync
4. Implement CDN for static assets
5. Add monitoring and logging (e.g., Prometheus, Grafana)

## 🐛 Troubleshooting

### Backend won't start
- Check if port 5000 is available
- Ensure `.env` file exists with required variables
- Check SQLite permissions

### Frontend can't connect to backend
- Verify `VITE_API_URL` in frontend `.env`
- Check CORS settings in backend
- Ensure backend is running

### GitHub sync fails
- Verify `GITHUB_TOKEN` has `repo` scope
- Check GitHub repo exists and is accessible
- Ensure `GITHUB_OWNER` is correct

## 📄 License

MIT License - feel free to use for personal or commercial projects.

## 🤝 Support

For issues or questions, please create an issue in the repository.

---

**Built with ❤️ for education**
