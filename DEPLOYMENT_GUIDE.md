# 🚀 Deployment Guide - Shree Classes Proctored Web App

**Version:** 2.0.0  
**Last Updated:** March 23, 2026  
**Deployment Target:** Vercel (Frontend) + Render (Backend) + GitHub (Backup)

---

## 📋 Pre-Deployment Checklist

### ✅ GitHub Backup Setup (COMPLETED)

- [x] GitHub Repository Created
  - **URL:** https://github.com/PatilSharvil/exam-data
  - **Branch:** main
  - **Visibility:** Private (recommended) or Public

- [x] Personal Access Token Generated
  - **Token:** `ghp_your_token_here`
  - **Scopes:** repo, workflow
  - ⚠️ **RECOMMENDATION:** Regenerate this token after deployment for security!

---

## 🎯 Step-by-Step Deployment

### **Phase 1: Deploy Backend to Render** (20 minutes)

#### **Step 1: Create Render Account**
1. Go to: https://render.com
2. Click **"Get Started for Free"**
3. Sign up with GitHub (recommended) or email
4. Verify your email

#### **Step 2: Create New Web Service**
1. Click **"New +"** → **"Web Service"**
2. Choose **"Connect a repository"**
3. Select your GitHub account
4. Find and select: `Shree-Classes-Proctored-Web-App`
5. Click **"Connect"**

#### **Step 3: Configure Service**

**Basic Settings:**
```
Name: shree-classes-backend
Region: Oregon (closest to India)
Branch: main
Root Directory: backend
Runtime: Node
Build Command: npm install
Start Command: npm start
```

**Instance Type:**
```
Select: Free Plan
```

#### **Step 4: Add Environment Variables**

Click **"Advanced"** → **"Add Environment Variable"** for each:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Required |
| `PORT` | `5000` | Auto-set by Render |
| `GITHUB_TOKEN` | `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` | **Your token** |
| `GITHUB_OWNER` | `PatilSharvil` | Your username |
| `GITHUB_REPO` | `exam-data` | Backup repo |
| `GITHUB_BRANCH` | `main` | Your branch |
| `EXCEL_PATH` | `data` | Excel folder path |
| `JWT_SECRET` | `shree-classes-proctored-exam-system-jwt-secret-key-2026-production` | Or generate new |
| `JWT_EXPIRE` | `1h` | Token expiry |
| `ALLOWED_ORIGINS` | `http://localhost:5173,https://your-app.vercel.app` | Update after Vercel deploy |
| `PROCTOR_VIOLATION_THRESHOLD` | `5` | Auto-submit at 5 violations |
| `PROCTOR_AUTO_SUBMIT` | `false` | Set true for auto-submit |
| `SQLITE_DB_PATH` | `./data/exam.db` | SQLite cache path |

**⚠️ IMPORTANT:** After Vercel deployment, update `ALLOWED_ORIGINS` with your actual Vercel URL.

#### **Step 5: Deploy**
1. Click **"Create Web Service"**
2. Wait for build to complete (~3-5 minutes)
3. Check logs for "Server is running on port 5000"
4. Note your Render URL: `https://shree-classes-backend-xxxx.onrender.com`

#### **Step 6: Test Backend**
1. Open: `https://shree-classes-backend-xxxx.onrender.com/health`
2. Should see:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-03-23T...",
  "environment": "production"
}
```

---

### **Phase 2: Setup UptimeRobot Keep-Alive** (5 minutes)

#### **Step 1: Create UptimeRobot Account**
1. Go to: https://uptimerobot.com
2. Click **"Sign Up"**
3. Create free account

#### **Step 2: Add Monitor**
1. Click **"Add New Monitor"**
2. **Monitor Type:** HTTP(s)
3. **Friendly Name:** `Shree Classes Backend Keep-Alive`
4. **URL:** `https://shree-classes-backend-xxxx.onrender.com/health` (your actual URL)
5. **Monitoring Interval:** 5 minutes
6. Click **"Create Monitor"**

#### **Step 3: Verify**
- Wait 10 minutes
- Check monitor status shows "Up"
- Backend should stay awake continuously

---

### **Phase 3: Deploy Frontend to Vercel** (10 minutes)

#### **Step 1: Create Vercel Account**
1. Go to: https://vercel.com
2. Click **"Sign Up"**
3. Sign up with GitHub (recommended)

#### **Step 2: Import Project**
1. Click **"Add New..."** → **"Project"**
2. Find and select: `Shree-Classes-Proctored-Web-App`
3. Click **"Import"**

#### **Step 3: Configure Project**

**Framework Preset:** Vite (auto-detected)  
**Root Directory:** `frontend`  
**Build Command:** `npm run build`  
**Output Directory:** `dist`  
**Install Command:** `npm install`

#### **Step 4: Add Environment Variables**

Click **"Environment Variables"** → **"Add"**:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://shree-classes-backend-xxxx.onrender.com/api` |

**⚠️ IMPORTANT:** Replace `xxxx` with your actual Render service URL.

#### **Step 5: Deploy**
1. Click **"Deploy"**
2. Wait for build (~2-3 minutes)
3. Note your Vercel URL: `https://shree-classes-proctored-web-app.vercel.app`

---

### **Phase 4: Update Backend CORS** (2 minutes)

#### **Step 1: Go Back to Render Dashboard**
1. Open your backend service
2. Click **"Environment"** tab

#### **Step 2: Update ALLOWED_ORIGINS**
```
ALLOWED_ORIGINS=http://localhost:5173,https://shree-classes-proctored-web-app.vercel.app
```

Replace with your actual Vercel URL.

#### **Step 3: Save and Redeploy**
1. Click **"Save Changes"**
2. Render will auto-redeploy (~1 minute)

---

### **Phase 5: Test Integration** (10 minutes)

#### **Test 1: Frontend Loads**
- [ ] Open Vercel URL
- [ ] Should see landing page
- [ ] No console errors

#### **Test 2: Login Works**
- [ ] Click "Login"
- [ ] Enter: `admin@example.com` / `Admin@123`
- [ ] Should redirect to admin dashboard

#### **Test 3: Backend API Accessible**
- [ ] Open browser DevTools → Network tab
- [ ] Navigate in app
- [ ] API calls should succeed (status 200/201)

#### **Test 4: GitHub Sync Working**
1. Wait 5-10 minutes after first login
2. Go to: https://github.com/PatilSharvil/exam-data
3. Should see Excel files appear:
   - `students.xlsx`
   - `exams.xlsx`
   - `questions.xlsx`
   - `attempts.xlsx`

#### **Test 5: UptimeRobot Keeping Alive**
1. Check UptimeRobot dashboard
2. Should show green "Up" status
3. Last response time < 500ms

---

## 🔧 Post-Deployment Tasks

### **Security Hardening** (IMPORTANT!)

#### **1. Regenerate GitHub Token**
1. Go to: https://github.com/settings/tokens
2. Delete old token: `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`
3. Generate new token with same scopes
4. Update in Render environment variables
5. Save and redeploy

#### **2. Change Admin Password**
1. Login as admin
2. Go to Profile
3. Change password from `Admin@123` to strong password
4. Save securely

#### **3. Update JWT_SECRET**
1. Generate new random secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Update in Render environment
3. Redeploy

---

### **Monitoring Setup**

#### **Render Logs**
- Dashboard → Logs tab
- Watch for errors
- Filter by level (error, warn, info)

#### **GitHub Backup Verification**
- Check repo daily for first week
- Verify Excel files updating
- Check commit history

#### **UptimeRobot Alerts**
- Dashboard → Settings → Alert Contacts
- Add your email
- Enable alerts for "Down" and "Recovery"

---

## 📊 Expected Performance

| Metric | Target | Acceptable |
|--------|--------|------------|
| Frontend Load Time | < 2s | < 5s |
| API Response Time | < 200ms | < 500ms |
| GitHub Sync Time | < 10s | < 30s |
| Uptime | > 99% | > 95% |
| First Request (after sleep) | N/A (always awake) | < 60s |

---

## 🐛 Troubleshooting

### **Problem: Backend won't start**
**Solution:**
1. Check Render logs
2. Verify all environment variables
3. Check `npm install` completed successfully
4. Look for "Server is running" message

### **Problem: GitHub sync failing**
**Solution:**
1. Verify GITHUB_TOKEN is valid
2. Check repo exists and is accessible
3. Verify GITHUB_OWNER and GITHUB_REPO are correct
4. Check branch name is `master` (not `main`)
5. Look for "GitHub sync completed" in logs

### **Problem: CORS errors in browser console**
**Solution:**
1. Update ALLOWED_ORIGINS in Render
2. Add your exact Vercel URL
3. Redeploy backend
4. Hard refresh frontend (Ctrl+Shift+R)

### **Problem: Excel files not appearing in GitHub**
**Solution:**
1. Wait 5-10 minutes (sync interval)
2. Check backend logs for sync messages
3. Verify GitHub token has `repo` scope
4. Manually trigger sync by calling `/health` endpoint

### **Problem: Server keeps going to sleep**
**Solution:**
1. Verify UptimeRobot monitor is active
2. Check monitor URL is correct
3. Ensure interval is 5 minutes (not 15+)
4. Check UptimeRobot dashboard for errors

---

## 📞 Support

### **Documentation**
- README.md - Project overview
- DEPLOYMENT_STRATEGY.md - Load balancing guide
- PROCOTORING_SYSTEM.md - Proctoring features
- TEST_REPORT_COMPREHENSIVE.md - Test results

### **Logs**
- Render Dashboard → Logs
- Vercel Dashboard → Functions
- GitHub Repo → Actions (if using GH Actions backup)

---

## ✅ Deployment Success Criteria

Your deployment is successful when:

- [ ] Frontend loads without errors
- [ ] Can login as admin
- [ ] Can create exam
- [ ] Can take exam as student
- [ ] Proctoring detects tab switches
- [ ] Excel files appear in GitHub repo
- [ ] UptimeRobot shows green status
- [ ] No console errors in browser
- [ ] API response times < 500ms
- [ ] GitHub sync completes every 5 min

---

## 🎉 Congratulations!

If all checkboxes are ✅, your **zero-budget production deployment is complete!**

**Total Monthly Cost:** $0  
**Setup Time:** ~45 minutes  
**Performance:** Production-ready  
**Scalability:** Up to 5000+ students  

---

**Next Steps:**
1. Test with real users
2. Monitor for first 24 hours
3. Collect feedback
4. Iterate and improve

**Good luck with your college project!** 🚀
